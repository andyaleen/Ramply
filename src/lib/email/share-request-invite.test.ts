import { describe, expect, test } from 'vitest'

import { buildShareRequestInviteHtml } from './share-request-invite'

describe('buildShareRequestInviteHtml', () => {
  test('includes requester, request type, counts, and share link', () => {
    const html = buildShareRequestInviteHtml({
      requesterName: 'Ramply LLC',
      requestType: 'General Request',
      shareLink: 'https://ramply.org/onboard/abc123',
      fieldCount: 3,
      documentCount: 2,
    })

    expect(html).toContain('Ramply LLC')
    expect(html).toContain('General Request')
    expect(html).toContain('3 company fields')
    expect(html).toContain('2 documents')
    expect(html).toContain('https://ramply.org/onboard/abc123')
  })

  test('escapes HTML in user-provided strings', () => {
    const html = buildShareRequestInviteHtml({
      requesterName: 'Evil <script>alert(1)</script> Co',
      requestType: 'Insurance &amp; Bonding',
      shareLink: 'https://example.com/onboard/token',
      fieldCount: 1,
      documentCount: 0,
    })

    expect(html).not.toContain('<script>')
    expect(html).toContain('Evil &lt;script&gt;alert(1)&lt;/script&gt; Co')
    expect(html).toContain('Insurance &amp;amp; Bonding')
  })
})
