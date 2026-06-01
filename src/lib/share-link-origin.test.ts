import { describe, expect, test } from 'vitest'

import { getShareLinkOrigin } from './share-link-origin'

describe('getShareLinkOrigin', () => {
  test('prefers Origin header for local dev', () => {
    const req = new Request('http://localhost:3000/api/share-requests', {
      headers: { origin: 'http://localhost:3000' },
    })
    expect(getShareLinkOrigin(req)).toBe('http://localhost:3000')
  })

  test('falls back to host header', () => {
    const req = new Request('http://localhost:3000/api/share-requests', {
      headers: { host: 'localhost:3000' },
    })
    expect(getShareLinkOrigin(req)).toBe('http://localhost:3000')
  })
})
