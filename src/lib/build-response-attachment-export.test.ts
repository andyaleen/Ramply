import { describe, expect, test } from 'vitest'

import {
  buildAttachmentExportResult,
  uniqueAttachmentFileName,
} from './build-response-attachment-export'

describe('uniqueAttachmentFileName', () => {
  test('returns the original name when unused', () => {
    const used = new Set<string>()
    expect(uniqueAttachmentFileName('w9.pdf', used)).toBe('w9.pdf')
    expect(used.has('w9.pdf')).toBe(true)
  })

  test('suffixes duplicate names', () => {
    const used = new Set<string>(['w9.pdf'])
    expect(uniqueAttachmentFileName('w9.pdf', used)).toBe('w9-2.pdf')
  })
})

describe('buildAttachmentExportResult', () => {
  test('returns a single file result for one attachment', async () => {
    const result = await buildAttachmentExportResult(
      [{ fileName: 'w9.pdf', buffer: Buffer.from('pdf'), mimeType: 'application/pdf' }],
      'bundle.zip'
    )

    expect(result?.kind).toBe('single')
    if (result?.kind === 'single') {
      expect(result.file.fileName).toBe('w9.pdf')
    }
  })

  test('returns a zip result for multiple attachments', async () => {
    const result = await buildAttachmentExportResult(
      [
        { fileName: 'w9.pdf', buffer: Buffer.from('pdf-one'), mimeType: 'application/pdf' },
        { fileName: 'coi.pdf', buffer: Buffer.from('pdf-two'), mimeType: 'application/pdf' },
      ],
      'bundle.zip'
    )

    expect(result?.kind).toBe('zip')
    if (result?.kind === 'zip') {
      expect(result.fileName).toBe('bundle.zip')
      expect(result.buffer.byteLength).toBeGreaterThan(0)
      expect(result.buffer.subarray(0, 2).toString()).toBe('PK')
    }
  })
})
