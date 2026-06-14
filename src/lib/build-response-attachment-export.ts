import type { SupabaseClient } from '@supabase/supabase-js'
import { ZipArchive } from 'archiver'
import { PassThrough } from 'stream'
import type { CompanyDocumentRow } from '@/lib/database.types'
import { DOCUMENTS_STORAGE_BUCKET } from '@/lib/vault-documents'

export type AttachmentExportFile = {
  fileName: string
  buffer: Buffer
  mimeType: string | null
}

export type AttachmentExportResult =
  | { kind: 'single'; file: AttachmentExportFile }
  | { kind: 'zip'; buffer: Buffer; fileName: string }

/** Download shared documents from storage for a response export bundle. */
export async function loadSharedDocumentsForAttachmentExport(
  admin: SupabaseClient,
  documents: CompanyDocumentRow[]
): Promise<AttachmentExportFile[]> {
  const files: AttachmentExportFile[] = []

  for (const document of documents) {
    if (!document.file_path) continue

    const { data, error } = await admin.storage
      .from(DOCUMENTS_STORAGE_BUCKET)
      .download(document.file_path)

    if (error || !data) continue

    const buffer = Buffer.from(await data.arrayBuffer())
    files.push({
      fileName: document.file_name?.trim() || `${document.document_type}.bin`,
      buffer,
      mimeType: document.mime_type,
    })
  }

  return files
}

/** Package attachment files as a single download or zip archive. */
export async function buildAttachmentExportResult(
  files: AttachmentExportFile[],
  zipFileName: string
): Promise<AttachmentExportResult | null> {
  if (files.length === 0) return null
  if (files.length === 1) {
    return { kind: 'single', file: files[0] }
  }

  const usedNames = new Set<string>()
  const entries = files.map((file) => ({
    name: uniqueAttachmentFileName(file.fileName, usedNames),
    buffer: file.buffer,
  }))

  return {
    kind: 'zip',
    fileName: zipFileName,
    buffer: await buildZipBuffer(entries),
  }
}

/** Ensure duplicate attachment names do not collide inside a zip archive. */
export function uniqueAttachmentFileName(fileName: string, usedNames: Set<string>): string {
  const sanitized = fileName.replace(/[/\\]/g, '_').trim() || 'attachment.bin'

  if (!usedNames.has(sanitized)) {
    usedNames.add(sanitized)
    return sanitized
  }

  const dotIndex = sanitized.lastIndexOf('.')
  const base = dotIndex > 0 ? sanitized.slice(0, dotIndex) : sanitized
  const extension = dotIndex > 0 ? sanitized.slice(dotIndex) : ''

  let counter = 2
  let candidate = `${base}-${counter}${extension}`
  while (usedNames.has(candidate)) {
    counter += 1
    candidate = `${base}-${counter}${extension}`
  }

  usedNames.add(candidate)
  return candidate
}

async function buildZipBuffer(entries: { name: string; buffer: Buffer }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const output = new PassThrough()

    output.on('data', (chunk: Buffer) => chunks.push(chunk))
    output.on('end', () => resolve(Buffer.concat(chunks)))
    output.on('error', reject)

    const archive = new ZipArchive({ zlib: { level: 9 } })
    archive.on('error', reject)
    archive.pipe(output)

    for (const entry of entries) {
      archive.append(entry.buffer, { name: entry.name })
    }

    void archive.finalize()
  })
}
