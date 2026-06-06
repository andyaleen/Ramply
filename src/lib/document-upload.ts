import { createHash } from 'crypto'

import type { DocumentTypeKey } from '@/lib/catalog'

export const MAX_DOCUMENT_UPLOAD_BYTES = 15 * 1024 * 1024

/** Strip unsafe characters from a user-provided file name before storage upload. */
export function sanitizeStorageFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? 'upload'
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 180)

  return cleaned || 'upload'
}

/** Build a stable storage key scoped to the signed-in user and document type. */
export function buildDocumentStoragePath(
  userId: string,
  docType: DocumentTypeKey,
  fileName: string
): string {
  const safeName = sanitizeStorageFileName(fileName)
  return `${userId}/${docType}/${Date.now()}_${safeName}`
}

/** Hash file bytes for vault deduplication (Node.js). */
export function hashFileBuffer(buffer: ArrayBuffer): string {
  return createHash('sha256').update(Buffer.from(buffer)).digest('hex')
}

/** Hash file bytes in the browser via Web Crypto. */
export async function hashFileBytes(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Ensure a storage object key belongs to the signed-in user. */
export function isUserOwnedDocumentPath(filePath: string, userId: string): boolean {
  const [ownerId] = filePath.split('/')
  return ownerId === userId
}

/** Convert upload failures into user-facing messages. */
export function getUploadErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    const message = err.message
    if (message.includes('row-level security') || message.includes('permission')) {
      return 'Upload blocked by permissions. Please sign in again and retry.'
    }
    if (message.includes('Bucket not found')) {
      return 'Document storage is not configured. Contact support.'
    }
    if (message.includes('Invalid key')) {
      return 'That file name is not supported. Rename the file and try again.'
    }
    if (message.includes('already exists')) {
      return 'This file already exists. Try replacing it again.'
    }
    if (message.includes('file_too_large')) {
      return `Max file size is ${MAX_DOCUMENT_UPLOAD_BYTES / (1024 * 1024)}MB.`
    }
    if (message.includes('admin credentials')) {
      return 'Document upload is not configured on the server. Contact support.'
    }
    if (message.includes('Unauthorized')) {
      return 'Your session expired. Sign in again and retry the upload.'
    }
    return message
  }

  return 'Upload failed. Please try again.'
}
