import type { FieldKey } from '@/lib/catalog'
import { fieldLabel } from '@/lib/catalog'

export const BUSINESS_TYPES = [
  { value: 'LLC', label: 'LLC' },
  { value: 'C Corp', label: 'C Corp' },
  { value: 'S Corp', label: 'S Corp' },
  { value: 'Sole Proprietor', label: 'Sole Proprietor' },
  { value: 'Non-profit', label: 'Non-profit' },
] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number]['value']

export const BUSINESS_TYPE_VALUES = new Set<string>(
  BUSINESS_TYPES.map((type) => type.value)
)

export const PAYMENT_METHODS = [
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'ACH', label: 'ACH' },
  { value: 'Wire', label: 'Wire' },
  { value: 'Check', label: 'Check' },
  { value: 'Cash', label: 'Cash' },
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export const PAYMENT_METHOD_VALUES = new Set<string>(
  PAYMENT_METHODS.map((method) => method.value)
)

export const PAYMENT_TERMS = [
  { value: 'Immediate', label: 'Immediate' },
  { value: '15 days', label: '15 days' },
  { value: '30 days', label: '30 days' },
  { value: '45 days', label: '45 days' },
  { value: '60 days', label: '60 days' },
  { value: '90 days', label: '90 days' },
] as const

export type PaymentTerm = (typeof PAYMENT_TERMS)[number]['value']

export const PAYMENT_TERM_VALUES = new Set<string>(
  PAYMENT_TERMS.map((term) => term.value)
)

export type FieldInputKind = 'text' | 'email' | 'tel' | 'url' | 'select'

export type FieldSelectOption = { value: string; label: string }

export type FieldInputConfig = {
  kind: FieldInputKind
  options?: readonly FieldSelectOption[]
  placeholder?: string
  digitsOnly?: boolean
  maxLength?: number
  exactLengthWhenNonBlank?: number
}

const FIELD_INPUT_CONFIG: Partial<Record<FieldKey, FieldInputConfig>> = {
  ein: {
    kind: 'text',
    digitsOnly: true,
    placeholder: '123456789',
  },
  naics: {
    kind: 'text',
    digitsOnly: true,
    maxLength: 6,
    exactLengthWhenNonBlank: 6,
    placeholder: '6-digit NAICS code',
  },
  business_type: {
    kind: 'select',
    options: BUSINESS_TYPES,
    placeholder: 'Select type',
  },
  payment_method: {
    kind: 'select',
    options: PAYMENT_METHODS,
    placeholder: 'Select payment method',
  },
  payment_terms: {
    kind: 'select',
    options: PAYMENT_TERMS,
    placeholder: 'Select payment terms',
  },
  contact_email: {
    kind: 'email',
    placeholder: 'jane@acme.com',
  },
  accounting_email: {
    kind: 'email',
    placeholder: 'accounting@acme.com',
  },
  bank_reference_email: {
    kind: 'email',
    placeholder: 'bank@example.com',
  },
  contact_phone: {
    kind: 'tel',
    placeholder: '(555) 000-0000',
  },
  accounting_phone: {
    kind: 'tel',
    placeholder: '(555) 000-0000',
  },
  website: {
    kind: 'url',
    placeholder: 'https://acme.com',
  },
}

/** Returns input rules for a catalog field, defaulting to plain text. */
export function getFieldInputConfig(fieldKey: string): FieldInputConfig {
  if (fieldKey in FIELD_INPUT_CONFIG) {
    return FIELD_INPUT_CONFIG[fieldKey as FieldKey]!
  }

  return {
    kind: 'text',
    placeholder: `Enter ${fieldLabel(fieldKey)}`,
  }
}

/** Strips disallowed characters and enforces length limits while typing. */
export function sanitizeFieldValue(fieldKey: string, value: string): string {
  const config = getFieldInputConfig(fieldKey)
  let sanitized = value

  if (config.digitsOnly) {
    sanitized = sanitized.replace(/\D/g, '')
  }

  if (config.maxLength !== undefined) {
    sanitized = sanitized.slice(0, config.maxLength)
  }

  return sanitized
}

/** Returns a validation message for a field value, or null when valid. */
export function getFieldValueError(fieldKey: string, value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  const config = getFieldInputConfig(fieldKey)

  if (config.exactLengthWhenNonBlank !== undefined && trimmed.length > 0) {
    if (trimmed.length !== config.exactLengthWhenNonBlank) {
      return `Must be ${config.exactLengthWhenNonBlank} digits`
    }
  }

  if (config.kind === 'select' && trimmed) {
    const allowed = getFieldSelectValues(fieldKey)
    if (allowed && !allowed.has(trimmed)) {
      return 'Select a valid option'
    }
  }

  return null
}

/** Whether a stored value is one of the allowed business type options. */
export function isAllowedBusinessType(value: string | null | undefined): boolean {
  if (!value?.trim()) return true
  return BUSINESS_TYPE_VALUES.has(value)
}

/** Whether a stored value is one of the allowed payment method options. */
export function isAllowedPaymentMethod(value: string | null | undefined): boolean {
  if (!value?.trim()) return true
  return PAYMENT_METHOD_VALUES.has(value)
}

/** Whether a stored value is one of the allowed payment term options. */
export function isAllowedPaymentTerm(value: string | null | undefined): boolean {
  if (!value?.trim()) return true
  return PAYMENT_TERM_VALUES.has(value)
}

/** Allowed select values for a field, if the field uses a fixed option list. */
export function getFieldSelectValues(fieldKey: string): Set<string> | null {
  const config = getFieldInputConfig(fieldKey)
  if (config.kind !== 'select' || !config.options) return null
  return new Set(config.options.map((option) => option.value))
}
