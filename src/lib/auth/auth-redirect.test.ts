import { describe, expect, test } from 'vitest'

import { getAuthConfirmNextPath } from './auth-redirect'

describe('getAuthConfirmNextPath', () => {
  test('uses recovery default when type is recovery', () => {
    expect(getAuthConfirmNextPath(null, 'recovery')).toBe('/auth/update-password')
  })

  test('respects explicit next path', () => {
    expect(getAuthConfirmNextPath('/onboard/abc', 'recovery')).toBe('/onboard/abc')
  })
})
