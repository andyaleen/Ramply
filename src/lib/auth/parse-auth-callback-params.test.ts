import { describe, expect, test } from 'vitest'

import {
  buildAuthConfirmPath,
  getAuthCallbackParamsFromLocation,
  hasAuthCallbackParams,
} from './parse-auth-callback-params'

describe('getAuthCallbackParamsFromLocation', () => {
  test('merges hash fragment params', () => {
    const params = getAuthCallbackParamsFromLocation({
      search: '',
      hash: '#access_token=abc&refresh_token=def&type=recovery',
    })
    expect(params.get('access_token')).toBe('abc')
    expect(params.get('type')).toBe('recovery')
  })
})

describe('buildAuthConfirmPath', () => {
  test('defaults recovery next path', () => {
    const params = new URLSearchParams('code=xyz&type=recovery')
    expect(buildAuthConfirmPath(params)).toContain('next=%2Fauth%2Fupdate-password')
  })

  test('routes Site URL code-only links to update-password', () => {
    const params = new URLSearchParams('code=xyz')
    expect(buildAuthConfirmPath(params)).toContain('next=%2Fauth%2Fupdate-password')
    expect(buildAuthConfirmPath(params)).toContain('type=recovery')
  })

  test('preserves OAuth callback with next dashboard', () => {
    const params = new URLSearchParams('code=xyz&next=%2Fdashboard')
    const path = buildAuthConfirmPath(params)
    expect(path).toContain('next=%2Fdashboard')
    expect(path).not.toContain('type=recovery')
  })
})

describe('hasAuthCallbackParams', () => {
  test('detects access_token in hash merge', () => {
    const params = getAuthCallbackParamsFromLocation({
      search: '',
      hash: '#access_token=abc&refresh_token=def',
    })
    expect(hasAuthCallbackParams(params)).toBe(true)
  })
})
