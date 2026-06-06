import { describe, expect, test } from 'vitest'

import type { CompanyDocumentRow } from '@/lib/database.types'
import {
  getVaultDocument,
  hasVaultDocument,
  missingVaultDocumentTypes,
} from './vault-documents'

const sampleDocs = [
  {
    id: 'doc-1',
    company_id: 'company-1',
    document_type: 'W9',
    file_path: 'user/W9/file.pdf',
    file_name: 'w9.pdf',
    file_size: 1000,
    mime_type: 'application/pdf',
    file_hash: 'abc',
    version: 1,
    superseded_by: null,
    uploaded_at: '2026-01-01T00:00:00.000Z',
    extracted_fields: {},
    approved_fields: null,
    approved_at: null,
  },
] as CompanyDocumentRow[]

describe('vault document helpers', () => {
  test('finds an active vault document by type', () => {
    expect(getVaultDocument(sampleDocs, 'W9')?.file_name).toBe('w9.pdf')
    expect(hasVaultDocument(sampleDocs, 'W9')).toBe(true)
    expect(hasVaultDocument(sampleDocs, 'voided_check')).toBe(false)
  })

  test('lists mandatory types still missing from the vault', () => {
    expect(missingVaultDocumentTypes(sampleDocs, ['W9', 'voided_check'])).toEqual(['voided_check'])
    expect(missingVaultDocumentTypes(sampleDocs, ['W9'])).toEqual([])
  })
})
