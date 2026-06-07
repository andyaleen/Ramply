import { describe, expect, test } from 'vitest'

import type { CompanyDocumentRow } from '@/lib/database.types'
import {
  isMissingVaultUploadRpc,
  parseVaultUploadRpcResult,
} from './complete-vault-upload'

const upload = {
  document_type: 'W9' as const,
  file_path: 'user-1/W9/123_file.pdf',
  file_name: 'file.pdf',
  file_size: 1000,
  mime_type: 'application/pdf',
  file_hash: 'abc123',
}

const sampleDoc = {
  id: 'doc-1',
  company_id: 'company-1',
  document_type: 'W9',
  file_path: 'user-1/W9/123_file.pdf',
  file_name: 'file.pdf',
  file_size: 1000,
  mime_type: 'application/pdf',
  file_hash: 'abc123',
  version: 1,
  superseded_by: null,
  uploaded_at: '2026-01-01T00:00:00.000Z',
  extracted_fields: {},
  approved_fields: null,
  approved_at: null,
} as CompanyDocumentRow

describe('isMissingVaultUploadRpc', () => {
  test('detects undeployed RPC errors', () => {
    expect(isMissingVaultUploadRpc({ code: 'PGRST202', message: 'function not found' })).toBe(true)
    expect(
      isMissingVaultUploadRpc({
        message: 'Could not find the function public.complete_vault_document_upload',
      })
    ).toBe(true)
    expect(isMissingVaultUploadRpc({ code: '42501', message: 'permission denied' })).toBe(false)
  })
})

describe('parseVaultUploadRpcResult', () => {
  test('parses a direct company_documents row', () => {
    expect(parseVaultUploadRpcResult(sampleDoc, upload)).toEqual({
      doc: sampleDoc,
      duplicate: false,
    })
  })

  test('parses JSONB wrapper payloads', () => {
    expect(
      parseVaultUploadRpcResult({ doc: sampleDoc, duplicate: false }, upload)
    ).toEqual({
      doc: sampleDoc,
      duplicate: false,
    })
  })

  test('parses stringified JSONB payloads', () => {
    expect(
      parseVaultUploadRpcResult(JSON.stringify({ doc: sampleDoc, duplicate: true }), upload)
    ).toEqual({
      doc: sampleDoc,
      duplicate: true,
    })
  })
})
