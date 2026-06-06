import { describe, expect, test } from 'vitest'

import {
  buildDocumentStoragePath,
  getUploadErrorMessage,
  sanitizeStorageFileName,
} from './document-upload'

describe('sanitizeStorageFileName', () => {
  test('removes path separators and unsafe characters', () => {
    expect(sanitizeStorageFileName('C:\\fakepath\\My W-9 (final).pdf')).toBe('My_W-9_final_.pdf')
    expect(sanitizeStorageFileName('invoice#1?.pdf')).toBe('invoice_1_.pdf')
  })
})

describe('buildDocumentStoragePath', () => {
  test('scopes uploads to the user and document type', () => {
    const path = buildDocumentStoragePath('user-123', 'W9', 'tax form.pdf')
    expect(path.startsWith('user-123/W9/')).toBe(true)
    expect(path.endsWith('_tax_form.pdf')).toBe(true)
  })
})

describe('getUploadErrorMessage', () => {
  test('maps known storage failures to friendly messages', () => {
    expect(getUploadErrorMessage(new Error('new row violates row-level security policy'))).toContain(
      'permissions'
    )
    expect(getUploadErrorMessage(new Error('Bucket not found'))).toContain('storage')
  })
})
