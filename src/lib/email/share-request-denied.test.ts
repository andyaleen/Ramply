import { describe, expect, test } from 'vitest'

import { buildShareRequestDeniedHtml } from './share-request-denied'

describe('buildShareRequestDeniedHtml', () => {
  test('includes request type and responses link', () => {
    const html = buildShareRequestDeniedHtml({
      requestType: 'Vendor Onboarding',
      recipientEmail: 'vendor@example.com',
      recipientCompanyName: 'Acme LLC',
      responsesUrl: 'https://www.ramply.org/dashboard/responses',
    })

    expect(html).toContain('Vendor Onboarding')
    expect(html).toContain('Acme LLC')
    expect(html).toContain('https://www.ramply.org/dashboard/responses')
    expect(html).toContain('declined')
  })
})
