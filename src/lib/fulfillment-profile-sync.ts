import { CATALOG_FIELDS, type FieldKey } from '@/lib/catalog'
import {
  ADDRESS_CATALOG_KEY,
  ADDRESS_COMPONENT_KEYS,
  type AddressComponentKey,
  type AddressComponents,
} from '@/lib/address-fields'
import type { CompanyRow } from '@/lib/database.types'

/** Map structured address columns onto a company profile update. */
export function profileUpdatesFromAddressComponents(
  components: AddressComponents
): Partial<CompanyRow> {
  const updates: Partial<CompanyRow> = {}

  for (const key of ADDRESS_COMPONENT_KEYS) {
    const value = components[key]?.trim()
    if (value) {
      updates[key] = value
    }
  }

  return updates
}

/** Map non-empty fulfillment answers onto company profile columns. */
export function profileUpdatesFromFulfillmentFields(
  fieldData: Partial<Record<FieldKey, string>>,
  addressComponents?: AddressComponents
): Partial<CompanyRow> {
  const updates: Partial<CompanyRow> = {
    ...profileUpdatesFromAddressComponents(addressComponents ?? {}),
  }

  for (const { key } of CATALOG_FIELDS) {
    if (key === ADDRESS_CATALOG_KEY) continue
    const value = fieldData[key]?.trim()
    if (value) {
      updates[key] = value
    }
  }

  return updates
}
