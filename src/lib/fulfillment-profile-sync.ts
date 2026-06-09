import { CATALOG_FIELDS, type FieldKey } from '@/lib/catalog'
import type { CompanyRow } from '@/lib/database.types'

/** Map non-empty fulfillment answers onto company profile columns. */
export function profileUpdatesFromFulfillmentFields(
  fieldData: Partial<Record<FieldKey, string>>
): Partial<CompanyRow> {
  const updates: Partial<CompanyRow> = {}

  for (const { key } of CATALOG_FIELDS) {
    const value = fieldData[key]?.trim()
    if (value) {
      updates[key] = value
    }
  }

  return updates
}
