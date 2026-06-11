export interface SharedDocumentDownloadPayload {
  signedUrl: string
  fileName: string
}

export interface SharedDocumentDownloadOptions {
  /** Signed URL lifetime in seconds (server caps at 3600). */
  ttlSeconds?: number
}

/** Request a signed download URL for a company document the user may access. */
export async function fetchSharedDocumentDownloadUrl(
  documentId: string,
  options: SharedDocumentDownloadOptions = {}
): Promise<SharedDocumentDownloadPayload> {
  const params = new URLSearchParams({ document_id: documentId })
  if (options.ttlSeconds != null) {
    params.set('ttl', String(options.ttlSeconds))
  }

  const response = await fetch(`/api/documents/shared/download?${params.toString()}`, {
    credentials: 'include',
  })

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
