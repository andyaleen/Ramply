import {
  responseAttachmentsZipFileName,
  responsePdfFileName,
  type ResponseDetailViewModel,
} from '@/lib/response-detail-view-model'

function parseDownloadFileName(response: Response, fallback: string): string {
  const disposition = response.headers.get('Content-Disposition')
  if (!disposition) return fallback

  const match = disposition.match(/filename="([^"]+)"/i)
  return match?.[1] ?? fallback
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

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
  triggerBlobDownload(blob, parseDownloadFileName(response, viewModel ? responsePdfFileName(viewModel) : 'share-response.pdf'))
}

/** Download all shared documents for a completed response (single file or zip). */
export async function downloadResponseAttachments(
  shareRequestId: string,
  viewModel?: ResponseDetailViewModel
): Promise<void> {
  const response = await fetch(`/api/share-requests/${shareRequestId}/export-attachments`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? 'Failed to download attachments')
  }

  const blob = await response.blob()
  triggerBlobDownload(
    blob,
    parseDownloadFileName(
      response,
      viewModel ? responseAttachmentsZipFileName(viewModel) : 'share-response-attachments.zip'
    )
  )
}
