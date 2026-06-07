import { describe, expect, test } from 'vitest'

import { isMissingVaultUploadRpc } from './complete-vault-upload'

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
