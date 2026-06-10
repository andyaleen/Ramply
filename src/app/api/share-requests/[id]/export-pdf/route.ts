import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportServerError } from '@/lib/monitoring'
import { buildResponseDetailViewModel, responsePdfFileName } from '@/lib/response-detail-view-model'
import { generateResponsePdf } from '@/lib/generate-response-pdf'
import { loadShareResponseForExport } from '@/lib/load-share-response-for-export'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

/**
 * Generate a PDF summary of a completed share response for the signed-in requester.
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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    const loaded = await loadShareResponseForExport(admin, user.id, parsed.data.id)
    if (!loaded) {
      return NextResponse.json({ error: 'Response not found or not accessible' }, { status: 403 })
    }

    const viewModel = buildResponseDetailViewModel(loaded.response)
    const pdfBuffer = await generateResponsePdf(viewModel, {
      requesterCompanyName: loaded.branding.legalName,
      logoBuffer: loaded.branding.logoBuffer,
      logoMimeType: loaded.branding.logoMimeType,
    })

    const fileName = responsePdfFileName(viewModel)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    reportServerError('share-requests.export-pdf', error, {
      shareRequestId: parsed.data.id,
      userId: user.id,
    })
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
