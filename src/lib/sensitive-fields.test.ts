import { describe, expect, test } from 'vitest'

import { maskEin, maskSensitiveValue } from './sensitive-fields'

describe('maskSensitiveValue', () => {
  test('masks all but last four characters', () => {
    expect(maskSensitiveValue('1234567890')).toBe('••••••7890')
  })
})

describe('maskEin', () => {
  test('masks digits in EIN', () => {
    expect(maskEin('12-3456789')).toBe('•••••6789')
  })
})
