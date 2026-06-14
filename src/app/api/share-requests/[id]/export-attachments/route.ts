import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAppSession } from '@/lib/auth/require-app-session'
import {
  buildAttachmentExportResult,
  loadSharedDocumentsForAttachmentExport,
} from '@/lib/build-response-attachment-export'
import { reportServerError } from '@/lib/monitoring'
import {
  buildResponseDetailViewModel,
  responseAttachmentsZipFileName,
} from '@/lib/response-detail-view-model'
import { loadShareResponseForExport } from '@/lib/load-share-response-for-export'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

/**
 * Download shared documents for a completed share response.
 * Returns a single file when there is one attachment, otherwise a zip archive.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const parsed = ParamsSchema.safeParse(params)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid share request id' }, { status: 400 })
  }

  const supabase = await createClient()
  const session = await requireAppSession(supabase)
  if (!session.ok) return session.response
  const { user } = session

  const admin = createAdminClient()

  try {
    const loaded = await loadShareResponseForExport(admin, user.id, parsed.data.id)
    if (!loaded) {
      return NextResponse.json({ error: 'Response not found or not accessible' }, { status: 403 })
    }

    const files = await loadSharedDocumentsForAttachmentExport(admin, loaded.response.sharedDocs)
    const viewModel = buildResponseDetailViewModel(loaded.response)
    const exportResult = await buildAttachmentExportResult(
      files,
      responseAttachmentsZipFileName(viewModel)
    )

    if (!exportResult) {
      return NextResponse.json({ error: 'No attachments available to download' }, { status: 404 })
    }

    if (exportResult.kind === 'single') {
      const { file } = exportResult
      return new NextResponse(new Uint8Array(file.buffer), {
        status: 200,
        headers: {
          'Content-Type': file.mimeType ?? 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${file.fileName}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return new NextResponse(new Uint8Array(exportResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${exportResult.fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    reportServerError('share-requests.export-attachments', error, {
      shareRequestId: parsed.data.id,
      userId: user.id,
    })
    return NextResponse.json({ error: 'Failed to download attachments' }, { status: 500 })
  }
}
