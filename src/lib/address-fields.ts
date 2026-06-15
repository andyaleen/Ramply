import { fieldLabel, CATALOG_FIELDS, ADDRESS_CATALOG_KEY } from '@/lib/catalog'

export { ADDRESS_CATALOG_KEY }

function catalogFieldOrderIndex(): Map<string, number> {
  return new Map(CATALOG_FIELDS.map((field, index) => [field.key, index]))
}

/** Legacy catalog keys replaced by {@link ADDRESS_CATALOG_KEY}. */
export const LEGACY_ADDRESS_CATALOG_KEYS = [
  'address_line1',
  'address_line2',
  'city',
  'state',
  'postal_code',
  'country',
] as const

/** Structured columns stored on `companies` and synced from forms. */
export const ADDRESS_COMPONENT_KEYS = [
  'address_line1',
  'address_line2',
  'city',
  'state',
  'postal_code',
  'country',
] as const

export type AddressComponentKey = (typeof ADDRESS_COMPONENT_KEYS)[number]

export type AddressComponents = Partial<Record<AddressComponentKey, string>>

const LEGACY_ADDRESS_KEY_SET = new Set<string>(LEGACY_ADDRESS_CATALOG_KEYS)

/** Whether a catalog / request field key represents address (current or legacy). */
export function isAddressRelatedCatalogKey(key: string): boolean {
  return key === ADDRESS_CATALOG_KEY || LEGACY_ADDRESS_KEY_SET.has(key)
}

/** Whether a share request or template includes address fields. */
export function requestIncludesAddress(fields: readonly string[] | null | undefined): boolean {
  return (fields ?? []).some(isAddressRelatedCatalogKey)
}

/** Replace legacy address catalog keys with the single `address` key. */
export function normalizeFieldSelections(fields: readonly string[] | null | undefined): string[] {
  const input = fields ?? []
  const nonAddress = input.filter((key) => !isAddressRelatedCatalogKey(key))
  if (!requestIncludesAddress(input)) return [...nonAddress]
  return [...nonAddress, ADDRESS_CATALOG_KEY]
}

/** Pick structured address values from a flat string map. */
export function pickAddressComponents(values: Record<string, string | null | undefined>): AddressComponents {
  const components: AddressComponents = {}
  for (const key of ADDRESS_COMPONENT_KEYS) {
    const value = values[key]
    if (typeof value === 'string' && value.trim()) {
      components[key] = value.trim()
    }
  }
  return components
}

/** Read address components from a company-like record. */
export function addressComponentsFromRecord(
  record: Partial<Record<AddressComponentKey, string | null>> | null | undefined
): AddressComponents {
  if (!record) return {}
  return pickAddressComponents(record as Record<string, string | null | undefined>)
}

/** Minimum fields required for a complete US-style address entry. */
export function isAddressComplete(components: AddressComponents): boolean {
  return Boolean(
    components.address_line1?.trim()
    && components.city?.trim()
    && components.state?.trim()
    && components.postal_code?.trim()
  )
}

/** Format structured address components for display and share payloads. */
export function formatAddressFromComponents(components: AddressComponents): string {
  const line1 = components.address_line1?.trim()
  const line2 = components.address_line2?.trim()
  const cityStateZip = [
    components.city?.trim(),
    components.state?.trim(),
    components.postal_code?.trim(),
  ].filter(Boolean).join(', ')
  const country = components.country?.trim()

  return [line1, line2, cityStateZip, country].filter(Boolean).join(', ')
}

/** Resolve a display value for shared address data (new or legacy shape). */
export function resolveAddressDisplayValue(fieldData: Record<string, unknown> | null | undefined): string {
  if (!fieldData) return '-'

  const formatted = fieldData[ADDRESS_CATALOG_KEY]
  if (typeof formatted === 'string' && formatted.trim()) return formatted.trim()

  const fromComponents = formatAddressFromComponents(pickAddressComponents(fieldData as Record<string, string>))
  return fromComponents || '-'
}

/** Default text shown in the autocomplete input from stored components. */
export function addressAutocompleteDefaultValue(components: AddressComponents): string {
  return formatAddressFromComponents(components) || components.address_line1?.trim() || ''
}

/** Split requested field keys into address vs non-address groups. */
export function partitionRequestFields(fields: readonly string[] | null | undefined): {
  includesAddress: boolean
  nonAddressFields: string[]
} {
  const input = fields ?? []
  return {
    includesAddress: requestIncludesAddress(input),
    nonAddressFields: input.filter((key) => !isAddressRelatedCatalogKey(key)),
  }
}

/**
 * Order requested field keys to match the send-request catalog layout.
 * Address appears after Business Type / NAICS, not at the top of the form.
 */
export function orderRequestedFields(fields: readonly string[] | null | undefined): string[] {
  const input = fields ?? []
  const deduped: string[] = []
  const seen = new Set<string>()

  for (const key of input) {
    if (isAddressRelatedCatalogKey(key)) {
      if (!seen.has(ADDRESS_CATALOG_KEY)) {
        seen.add(ADDRESS_CATALOG_KEY)
        deduped.push(ADDRESS_CATALOG_KEY)
      }
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(key)
  }

  return deduped.sort((a, b) => {
    const catalogOrder = catalogFieldOrderIndex()
    const orderA = catalogOrder.get(a)
    const orderB = catalogOrder.get(b)

    if (orderA !== undefined && orderB !== undefined) return orderA - orderB
    if (orderA !== undefined) return -1
    if (orderB !== undefined) return 1

    return input.indexOf(a) - input.indexOf(b)
  })
}

/** Build the JSON payload sent to fulfill_share_request for address-aware requests. */
export function buildShareAddressFieldPayload(
  requestedFields: readonly string[],
  components: AddressComponents
): Record<string, string> {
  const requested = new Set(requestedFields)
  const payload: Record<string, string> = {}

  if (requested.has(ADDRESS_CATALOG_KEY)) {
    payload[ADDRESS_CATALOG_KEY] = formatAddressFromComponents(components)
    return payload
  }

  for (const key of LEGACY_ADDRESS_CATALOG_KEYS) {
    if (requested.has(key)) {
      payload[key] = components[key]?.trim() ?? ''
    }
  }

  return payload
}

/** Label helper for address catalog key. */
export function addressCatalogLabel(): string {
  return fieldLabel(ADDRESS_CATALOG_KEY)
}
