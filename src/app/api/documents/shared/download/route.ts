import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportServerError } from '@/lib/monitoring'
import { loadDownloadableDocumentForUser } from '@/lib/shared-document-access'
import { DOCUMENTS_STORAGE_BUCKET } from '@/lib/vault-documents'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const DownloadQuerySchema = z.object({
  document_id: z.string().uuid(),
})

/**
 * Returns a short-lived signed URL for a shared company document.
 * Access is verified server-side for owners and completed-share requesters.
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

  const admin = createAdminClient()
  let doc: { file_path: string; file_name: string } | null = null

  try {
    doc = await loadDownloadableDocumentForUser(admin, user.id, parsed.data.document_id)
  } catch (error) {
    reportServerError('documents.shared-download.load', error, {
      documentId: parsed.data.document_id,
      userId: user.id,
    })
    return NextResponse.json({ error: 'Failed to load document' }, { status: 500 })
  }

  if (!doc?.file_path) {
    return NextResponse.json({ error: 'Document not found or not accessible' }, { status: 403 })
  }

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
