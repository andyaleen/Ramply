import { describe, expect, it } from 'vitest'
import {
  BUSINESS_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_TERM_VALUES,
  getFieldInputConfig,
  getFieldSelectValues,
  getFieldValueError,
  isAllowedBusinessType,
  isAllowedPaymentMethod,
  isAllowedPaymentTerm,
  sanitizeFieldValue,
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

  it('defines payment method and payment terms as selects', () => {
    expect(getFieldInputConfig('payment_method').options?.map((option) => option.value)).toEqual([
      'Credit Card',
      'ACH',
      'Wire',
      'Check',
      'Cash',
    ])
    expect(getFieldInputConfig('payment_terms').options?.map((option) => option.value)).toEqual([
      'Immediate',
      '15 days',
      '30 days',
      '45 days',
      '60 days',
      '90 days',
    ])
  })

  it('restricts EIN and NAICS to digits', () => {
    expect(sanitizeFieldValue('ein', '12-3456789')).toBe('123456789')
    expect(sanitizeFieldValue('naics', '54a321')).toBe('54321')
    expect(sanitizeFieldValue('naics', '1234567890')).toBe('123456')
  })

  it('validates NAICS length when provided', () => {
    expect(getFieldValueError('naics', '')).toBeNull()
    expect(getFieldValueError('naics', '123456')).toBeNull()
    expect(getFieldValueError('naics', '12345')).toBe('Must be 6 digits')
  })

  it('validates allowed business types', () => {
    expect(isAllowedBusinessType('')).toBe(true)
    expect(isAllowedBusinessType('LLC')).toBe(true)
    expect(isAllowedBusinessType('C Corp')).toBe(true)
    expect(isAllowedBusinessType('Corporation')).toBe(false)
  })

  it('validates allowed payment methods and terms', () => {
    expect(isAllowedPaymentMethod('ACH')).toBe(true)
    expect(isAllowedPaymentMethod('Bitcoin')).toBe(false)
    expect(isAllowedPaymentTerm('30 days')).toBe(true)
    expect(isAllowedPaymentTerm('Net 30')).toBe(false)
  })

  it('returns select values for business type', () => {
    const values = getFieldSelectValues('business_type')
    expect(values).toEqual(BUSINESS_TYPE_VALUES)
  })

  it('returns select values for payment fields', () => {
    expect(getFieldSelectValues('payment_method')).toEqual(PAYMENT_METHOD_VALUES)
    expect(getFieldSelectValues('payment_terms')).toEqual(PAYMENT_TERM_VALUES)
  })

  it('defaults unknown fields to text input', () => {
    expect(getFieldInputConfig('legal_name').kind).toBe('text')
  })
})
