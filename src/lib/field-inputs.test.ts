import { describe, expect, it } from 'vitest'
import {
  BUSINESS_TYPE_VALUES,
  getFieldInputConfig,
  getFieldSelectValues,
  isAllowedBusinessType,
} from '@/lib/field-inputs'

describe('field-inputs', () => {
  it('defines business type as a select with the expected options', () => {
    const config = getFieldInputConfig('business_type')
    expect(config.kind).toBe('select')
    expect(config.options?.map((option) => option.value)).toEqual([
      'LLC',
      'C Corp',
      'S Corp',
      'Sole Proprietor',
      'Non-profit',
    ])
  })

  it('validates allowed business types', () => {
    expect(isAllowedBusinessType('')).toBe(true)
    expect(isAllowedBusinessType('LLC')).toBe(true)
    expect(isAllowedBusinessType('C Corp')).toBe(true)
    expect(isAllowedBusinessType('Corporation')).toBe(false)
  })

  it('returns select values for business type', () => {
    const values = getFieldSelectValues('business_type')
    expect(values).toEqual(BUSINESS_TYPE_VALUES)
  })

  it('defaults unknown fields to text input', () => {
    expect(getFieldInputConfig('legal_name').kind).toBe('text')
  })
})
