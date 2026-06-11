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

export type FieldInputKind = 'text' | 'email' | 'tel' | 'url' | 'select'

export type FieldSelectOption = { value: string; label: string }

export type FieldInputConfig = {
  kind: FieldInputKind
  options?: readonly FieldSelectOption[]
  placeholder?: string
}

const FIELD_INPUT_CONFIG: Partial<Record<FieldKey, FieldInputConfig>> = {
  business_type: {
    kind: 'select',
    options: BUSINESS_TYPES,
    placeholder: 'Select type',
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

/** Whether a stored value is one of the allowed business type options. */
export function isAllowedBusinessType(value: string | null | undefined): boolean {
  if (!value?.trim()) return true
  return BUSINESS_TYPE_VALUES.has(value)
}

/** Allowed select values for a field, if the field uses a fixed option list. */
export function getFieldSelectValues(fieldKey: string): Set<string> | null {
  const config = getFieldInputConfig(fieldKey)
  if (config.kind !== 'select' || !config.options) return null
  return new Set(config.options.map((option) => option.value))
}
