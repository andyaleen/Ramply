import { responsePdfFileName, type ResponseDetailViewModel } from '@/lib/response-detail-view-model'

/** Download a completed share response summary PDF from the API. */
export async function downloadResponsePdf(
  shareRequestId: string,
  viewModel?: ResponseDetailViewModel
): Promise<void> {
  const response = await fetch(`/api/share-requests/${shareRequestId}/export-pdf`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? 'Failed to export PDF')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = viewModel ? responsePdfFileName(viewModel) : 'share-response.pdf'
  anchor.click()
  URL.revokeObjectURL(url)
}
