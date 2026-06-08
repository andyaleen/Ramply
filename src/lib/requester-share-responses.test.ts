import { describe, expect, test } from 'vitest'

import { resolveRecipientCompanyLabel } from './requester-share-responses'

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
