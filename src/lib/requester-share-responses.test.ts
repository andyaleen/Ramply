import { describe, expect, test } from 'vitest'

import {
  isMissingDeniedColumns,
  isMissingRequesterShareRpc,
  resolveRecipientCompanyLabel,
} from './requester-share-responses'

describe('resolveRecipientCompanyLabel', () => {
  test('uses shared field data when company row is hidden', () => {
    expect(
      resolveRecipientCompanyLabel(null, {
        field_data: { legal_name: 'Acme Supplies LLC' },
      })
    ).toBe('Acme Supplies LLC')
  })

  test('prefers company row names over shared field data', () => {
    expect(
      resolveRecipientCompanyLabel(
        { legal_name: 'Stored Legal Name', dba_name: null },
        { field_data: { legal_name: 'Submitted Name' } }
      )
    ).toBe('Stored Legal Name')
  })

  test('falls back to recipient email', () => {
    expect(resolveRecipientCompanyLabel(null, null, 'vendor@example.com')).toBe('vendor@example.com')
  })
})

describe('isMissingDeniedColumns', () => {
  test('detects schema-cache errors for deny columns', () => {
    expect(
      isMissingDeniedColumns({
        code: 'PGRST204',
        message: "Could not find the 'denied_at' column of 'share_requests' in the schema cache",
      })
    ).toBe(true)
  })
})

describe('isMissingRequesterShareRpc', () => {
  test('detects undeployed RPC functions', () => {
    expect(isMissingRequesterShareRpc({ code: 'PGRST202', message: 'function not found' })).toBe(true)
    expect(
      isMissingRequesterShareRpc({
        message: 'Could not find the function public.get_requester_shared_documents',
      })
    ).toBe(true)
  })
})
