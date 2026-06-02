import { describe, expect, test, afterEach } from 'vitest'

import { readEnv } from './env'

describe('readEnv', () => {
  afterEach(() => {
    delete process.env.TEST_ENV_VAR
  })

  test('returns undefined for missing values', () => {
    expect(readEnv('TEST_ENV_VAR')).toBeUndefined()
  })

  test('trims whitespace', () => {
    process.env.TEST_ENV_VAR = '  value  '
    expect(readEnv('TEST_ENV_VAR')).toBe('value')
  })

  test('strips wrapping double quotes', () => {
    process.env.TEST_ENV_VAR = '"re_example_key"'
    expect(readEnv('TEST_ENV_VAR')).toBe('re_example_key')
  })
})
