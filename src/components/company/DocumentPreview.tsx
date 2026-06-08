'use client'

import { Button } from '@/components/ui/button'

interface DocumentPreviewProps {
  url: string | null
  mimeType: string | null
  fileName: string
  loading?: boolean
  error?: string | null
}

function isPdfDocument(mimeType: string | null, fileName: string): boolean {
  return mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
}

function isImageDocument(mimeType: string | null): boolean {
  return Boolean(mimeType?.startsWith('image/'))
}

/**
 * Inline preview for vault documents (PDF iframe or image).
 */
export function DocumentPreview({
  url,
  mimeType,
  fileName,
  loading = false,
  error = null,
}: DocumentPreviewProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading preview…</p>
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>
  }

  if (!url) {
    return (
      <p className="text-sm text-muted-foreground">
        Preview unavailable. Use Open file to view the document.
      </p>
    )
  }

  if (isPdfDocument(mimeType, fileName)) {
    return (
      <iframe
        src={url}
        title={fileName}
        className="h-[min(70vh,720px)] w-full rounded-md border bg-white"
      />
    )
  }

  if (isImageDocument(mimeType)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={fileName}
        className="max-h-[min(70vh,720px)] w-full rounded-md border object-contain bg-white"
      />
    )
  }

  return (
    <Button asChild variant="outline">
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open {fileName}
      </a>
    </Button>
  )
}
