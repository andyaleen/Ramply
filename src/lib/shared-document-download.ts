export interface SharedDocumentDownloadPayload {
  signedUrl: string
  fileName: string
}

/** Request a signed download URL for a company document the user may access. */
export async function fetchSharedDocumentDownloadUrl(
  documentId: string
): Promise<SharedDocumentDownloadPayload> {
  const response = await fetch(
    `/api/documents/shared/download?document_id=${encodeURIComponent(documentId)}`,
    { credentials: 'include' }
  )

  const payload = (await response.json().catch(() => ({}))) as SharedDocumentDownloadPayload & {
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to get download link')
  }

  if (!payload.signedUrl || !payload.fileName) {
    throw new Error('Invalid download response')
  }

  return payload
}

/** Trigger a browser download from a signed storage URL. */
export function downloadFromSignedUrl(signedUrl: string, fileName: string): void {
  const anchor = document.createElement('a')
  anchor.href = signedUrl
  anchor.download = fileName
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}
