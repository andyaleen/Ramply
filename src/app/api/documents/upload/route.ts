import { NextResponse } from 'next/server'
import { z } from 'zod'

import { CATALOG_DOCUMENT_TYPES, type DocumentTypeKey } from '@/lib/catalog'
import {
  buildDocumentStoragePath,
  getUploadErrorMessage,
  hashFileBuffer,
  MAX_DOCUMENT_UPLOAD_BYTES,
} from '@/lib/document-upload'
import type { CompanyDocumentRow } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

const docTypeKeys = CATALOG_DOCUMENT_TYPES.map((doc) => doc.key) as [
  DocumentTypeKey,
  ...DocumentTypeKey[],
]

const UploadSchema = z.object({
  document_type: z.enum(docTypeKeys),
})

/** Upload a company document to storage and persist the vault row for the signed-in user. */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    const documentTypeRaw = formData.get('document_type')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const parsed = UploadSchema.safeParse({ document_type: documentTypeRaw })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: 'file_too_large',
          message: `Max file size is ${MAX_DOCUMENT_UPLOAD_BYTES / (1024 * 1024)}MB`,
        },
        { status: 413 }
      )
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 })
    }

    const docType = parsed.data.document_type
    const buffer = await file.arrayBuffer()
    const hash = hashFileBuffer(buffer)

    const { data: existing, error: existingError } = await supabase
      .from('company_documents')
      .select('*')
      .eq('company_id', company.id)
      .eq('document_type', docType)
      .is('superseded_by', null)
      .maybeSingle()

    if (existingError) throw existingError

    const existingDoc = existing as CompanyDocumentRow | null
    if (existingDoc?.file_hash === hash) {
      return NextResponse.json({ doc: existingDoc, duplicate: true })
    }

    const filePath = buildDocumentStoragePath(user.id, docType, file.name)
    const contentType = file.type || 'application/octet-stream'

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, { upsert: false, contentType })

    if (storageError) throw storageError

    const nextVersion = (existingDoc?.version ?? 0) + 1
    const { data: newRow, error: insertError } = await supabase
      .from('company_documents')
      .insert({
        company_id: company.id,
        document_type: docType,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: contentType,
        file_hash: hash,
        version: nextVersion,
        extracted_fields: {},
      })
      .select()
      .single()

    if (insertError) {
      await supabase.storage.from('documents').remove([filePath])
      throw insertError
    }

    if (existingDoc) {
      const { error: supersedeError } = await supabase
        .from('company_documents')
        .update({ superseded_by: newRow.id })
        .eq('id', existingDoc.id)

      if (supersedeError) throw supersedeError
    }

    return NextResponse.json({ doc: newRow, duplicate: false })
  } catch (err) {
    console.error('Document upload failed:', err)
    return NextResponse.json({ error: getUploadErrorMessage(err) }, { status: 500 })
  }
}
