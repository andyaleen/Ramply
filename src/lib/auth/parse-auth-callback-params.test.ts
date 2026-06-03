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
