import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { createClient } from '@/lib/supabase/server'
import { runOcr } from '@/lib/ocr'
import { extractW9Fields } from '@/lib/ocr/w9-extractor'
import { classifyDocument } from '@/lib/ocr/classifier'

const IngestSchema = z.object({
  company_document_id: z.string().uuid(),
})

const MAX_FILE_BYTES = 15 * 1024 * 1024

/** Convert a Blob to base64-encoded string content. */
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer())
  return buffer.toString('base64')
}

/** Infer a mime type when the stored value is missing. */
function resolveMimeType(fileName: string, storedMimeType: string | null): string {
  if (storedMimeType) return storedMimeType
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return 'application/octet-stream'
}

/** POST /api/documents/ingest — OCR a company document and persist extraction results. */
export async function POST(req: Request) {
  const supabase = await createClient()
  const session = await requireAppSession(supabase)
  if (!session.ok) return session.response
  const { user } = session

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = IngestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 400 })
  }

  const { data: documentRow, error: docError } = await supabase
    .from('company_documents')
    .select('*')
    .eq('id', parsed.data.company_document_id)
    .eq('company_id', company.id)
    .single()

  if (docError || !documentRow) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (documentRow.file_size && documentRow.file_size > MAX_FILE_BYTES) {
    return NextResponse.json({
      error: 'file_too_large',
      message: `Max file size is ${MAX_FILE_BYTES / (1024 * 1024)}MB`,
    }, { status: 413 })
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from('documents')
    .download(documentRow.file_path)

  if (downloadError || !fileBlob) {
    console.error('Failed to download document:', downloadError)
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 })
  }

  const mimeType = resolveMimeType(documentRow.file_name, documentRow.mime_type)

  try {
    const ocrResult = await runOcr({
      fileName: documentRow.file_name,
      mimeType,
      contentBase64: await blobToBase64(fileBlob),
    })

    // Run OCR field extraction and document classification in parallel
    const [extractedFields, detectedDocumentType] = await Promise.all([
      Promise.resolve(
        documentRow.document_type === 'W9'
          ? extractW9Fields(ocrResult.documentJson, ocrResult.rawText)
          : null
      ),
      classifyDocument(ocrResult.rawText),
    ])

    if (extractedFields) {
      const { error: fieldsUpdateError } = await supabase
        .from('company_documents')
        .update({ extracted_fields: extractedFields })
        .eq('id', documentRow.id)

      if (fieldsUpdateError) {
        console.error('Failed to save extracted fields:', fieldsUpdateError)
        return NextResponse.json({ error: 'Failed to save extracted fields' }, { status: 500 })
      }
    }

    const storedRawText =
      documentRow.document_type === 'W9'
        ? null
        : ocrResult.rawText?.slice(0, 50_000) ?? null

    const { data: extraction, error: insertError } = await supabase
      .from('document_extractions')
      .insert({
        company_id: company.id,
        company_document_id: documentRow.id,
        provider: ocrResult.provider,
        status: 'succeeded',
        raw_text: storedRawText,
        structured_data: ocrResult.documentJson,
        metadata: {
          ...ocrResult.metadata,
          extracted_fields: extractedFields,
          detected_document_type: detectedDocumentType,
        },
      })
      .select()
      .single()

    if (insertError || !extraction) {
      console.error('Failed to persist OCR extraction:', insertError)
      return NextResponse.json({ error: 'Failed to persist OCR extraction' }, { status: 500 })
    }

    return NextResponse.json({ extraction, detected_document_type: detectedDocumentType })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown OCR error'

    const { error: failedInsertError } = await supabase
      .from('document_extractions')
      .insert({
        company_id: company.id,
        company_document_id: documentRow.id,
        provider: process.env.OCR_PROVIDER ?? 'google_document_ai',
        status: 'failed',
        error_message: message,
        metadata: {
          fileName: documentRow.file_name,
          mimeType,
        },
      })

    if (failedInsertError) {
      console.error('Failed to record OCR failure:', failedInsertError)
    }

    console.error('OCR failed:', error)
    return NextResponse.json({ error: 'OCR failed', message }, { status: 500 })
  }
}
