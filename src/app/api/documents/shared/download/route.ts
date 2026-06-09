import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportServerError } from '@/lib/monitoring'
import { DOCUMENTS_STORAGE_BUCKET } from '@/lib/vault-documents'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const DownloadQuerySchema = z.object({
  document_id: z.string().uuid(),
})

/**
 * Returns a short-lived signed URL for a shared company document.
 * Access is enforced via RLS on company_documents (owner or requester).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = DownloadQuerySchema.safeParse({
    document_id: url.searchParams.get('document_id'),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: doc, error: docError } = await supabase
    .from('company_documents')
    .select('file_path, file_name')
    .eq('id', parsed.data.document_id)
    .maybeSingle()

  if (docError) {
    reportServerError('documents.shared-download.load', docError, {
      documentId: parsed.data.document_id,
      userId: user.id,
    })
    return NextResponse.json({ error: 'Failed to load document' }, { status: 500 })
  }

  if (!doc?.file_path) {
    return NextResponse.json({ error: 'Document not found or not accessible' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error: signedUrlError } = await admin.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .createSignedUrl(doc.file_path, 120)

  if (signedUrlError || !data?.signedUrl) {
    reportServerError(
      'documents.shared-download.signed-url',
      signedUrlError ?? new Error('Missing signed URL'),
      { documentId: parsed.data.document_id, filePath: doc.file_path }
    )
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    fileName: doc.file_name,
  })
}
