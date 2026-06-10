import { sanitizeStorageFileName } from '@/lib/document-upload'

export const MAX_LOGO_UPLOAD_BYTES = 2 * 1024 * 1024

export const ALLOWED_LOGO_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
])

const LOGO_EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

/** Validate a company logo file before upload. */
export function validateLogoFile(file: File): string | null {
  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_LOGO_MIME_TYPES.has(mime)) {
    return 'Logo must be a PNG, JPEG, WebP, or SVG image.'
  }
  if (file.size > MAX_LOGO_UPLOAD_BYTES) {
    return `Logo must be ${MAX_LOGO_UPLOAD_BYTES / (1024 * 1024)}MB or smaller.`
  }
  return null
}

/** Build a stable storage key for the company logo (replaced on each upload). */
export function buildLogoStoragePath(userId: string, file: File): string {
  const mime = file.type || 'application/octet-stream'
  const ext = LOGO_EXTENSION_BY_MIME[mime] ?? sanitizeStorageFileName(file.name).split('.').pop() ?? 'png'
  return `${userId}/logo/logo.${ext}`
}

/** True when a storage path is the signed-in user's logo folder. */
export function isUserOwnedLogoPath(filePath: string, userId: string): boolean {
  return filePath.startsWith(`${userId}/logo/`)
}
