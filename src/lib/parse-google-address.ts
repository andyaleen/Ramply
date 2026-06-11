import type { AddressComponentKey, AddressComponents } from '@/lib/address-fields'

type LegacyAddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

type PlaceAddressComponent = {
  longText?: string
  shortText?: string
  types: string[]
}

type NormalizedAddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

/** Extract a normalized address component by type. */
function getComponent(
  components: NormalizedAddressComponent[],
  type: string,
  name: 'long_name' | 'short_name' = 'long_name'
): string {
  const match = components.find((component) => component.types.includes(type))
  return match?.[name]?.trim() ?? ''
}

/** Map normalized Google address components into Ramply address columns. */
export function parseGoogleAddressComponents(
  components: NormalizedAddressComponent[]
): AddressComponents {
  const streetNumber = getComponent(components, 'street_number')
  const route = getComponent(components, 'route')
  const addressLine1 = [streetNumber, route].filter(Boolean).join(' ')

  const city =
    getComponent(components, 'locality')
    || getComponent(components, 'postal_town')
    || getComponent(components, 'sublocality')

  return {
    address_line1: addressLine1,
    address_line2: getComponent(components, 'subpremise'),
    city,
    state: getComponent(components, 'administrative_area_level_1', 'short_name'),
    postal_code: getComponent(components, 'postal_code'),
    country: getComponent(components, 'country'),
  }
}

/** Whether parsed components include a street-level match. */
export function isStreetLevelAddress(components: AddressComponents): boolean {
  return Boolean(components.address_line1?.trim())
}

/** Merge parsed address values without wiping suite/unit when Google omits subpremise. */
export function mergeAddressComponents(
  current: AddressComponents,
  parsed: AddressComponents
): AddressComponents {
  const merged: AddressComponents = { ...current, ...parsed }
  if (!parsed.address_line2?.trim() && current.address_line2?.trim()) {
    merged.address_line2 = current.address_line2
  }
  return merged
}

function normalizeLegacyComponent(component: LegacyAddressComponent): NormalizedAddressComponent {
  return {
    long_name: component.long_name,
    short_name: component.short_name,
    types: component.types,
  }
}

function normalizePlaceComponent(component: PlaceAddressComponent): NormalizedAddressComponent {
  return {
    long_name: component.longText?.trim() ?? '',
    short_name: component.shortText?.trim() ?? component.longText?.trim() ?? '',
    types: component.types,
  }
}

/** Normalize legacy or Places (New) address component arrays. */
export function normalizeAddressComponents(value: unknown): NormalizedAddressComponent[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null || !Array.isArray((item as { types?: unknown }).types)) {
        return null
      }

      if ('long_name' in item && 'short_name' in item) {
        return normalizeLegacyComponent(item as LegacyAddressComponent)
      }

      if ('longText' in item || 'shortText' in item) {
        return normalizePlaceComponent(item as PlaceAddressComponent)
      }

      return null
    })
    .filter((item): item is NormalizedAddressComponent => item !== null)
}

/** Parse unknown Google address component payloads from legacy or new APIs. */
export function parseAddressComponentsFromGoogle(value: unknown): AddressComponents {
  return parseGoogleAddressComponents(normalizeAddressComponents(value))
}

/** @deprecated Use normalizeAddressComponents */
export function asAddressComponents(value: unknown): LegacyAddressComponent[] {
  return normalizeAddressComponents(value).map((component) => ({
    long_name: component.long_name,
    short_name: component.short_name,
    types: component.types,
  }))
}

export type { AddressComponentKey }
