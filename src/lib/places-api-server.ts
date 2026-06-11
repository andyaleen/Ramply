import { readEnv } from '@/lib/env'

export type PlaceSuggestion = {
  placeResourceName: string
  label: string
}

/** Server-side Places key. Falls back to the public key for local dev. */
export function getServerPlacesApiKey(): string | undefined {
  return readEnv('GOOGLE_PLACES_API_KEY') ?? readEnv('NEXT_PUBLIC_GOOGLE_PLACES_API_KEY')
}

/** Referer sent on server-side Places requests (must match an allowed HTTP referrer on the key). */
export function getPlacesServerReferer(): string {
  const configured = readEnv('GOOGLE_PLACES_SERVER_REFERER')
  if (configured) {
    return configured.endsWith('/') ? configured : `${configured}/`
  }

  const appUrl = readEnv('NEXT_PUBLIC_APP_URL')?.replace(/\/$/, '')
  if (appUrl) {
    try {
      const url = new URL(appUrl.startsWith('http') ? appUrl : `https://${appUrl}`)
      // Vercel serves www but the key may only allow apex — prefer apex for server calls.
      url.hostname = url.hostname.replace(/^www\./i, '')
      return `${url.origin}/`
    } catch {
      // fall through
    }
  }

  return 'https://ramply.org/'
}

function placesRequestHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    Referer: getPlacesServerReferer(),
  }
}

/** Whether server-side Places autocomplete is configured. */
export function isServerPlacesConfigured(): boolean {
  return Boolean(getServerPlacesApiKey())
}

/** Fetch address suggestions via Places API (New) from the server. */
export async function fetchPlaceAutocompleteSuggestions(input: string): Promise<PlaceSuggestion[]> {
  const apiKey = getServerPlacesApiKey()
  if (!apiKey) {
    throw new Error('Google Places API key is not configured')
  }

  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: placesRequestHeaders(apiKey),
    body: JSON.stringify({
      input,
      includedRegionCodes: ['us'],
    }),
  })

  const payload = await response.text()
  if (!response.ok) {
    throw new Error(`Places autocomplete failed (${response.status}): ${payload}`)
  }

  const data = JSON.parse(payload) as {
    suggestions?: Array<{
      placePrediction?: {
        place?: string
        text?: { text?: string }
      }
    }>
  }

  return (data.suggestions ?? [])
    .map((suggestion) => {
      const placeResourceName = suggestion.placePrediction?.place?.trim()
      const label = suggestion.placePrediction?.text?.text?.trim()
      if (!placeResourceName || !label) return null
      return { placeResourceName, label }
    })
    .filter((item): item is PlaceSuggestion => item !== null)
}

/** Load structured address fields for a Places API (New) resource name. */
export async function fetchPlaceAddressComponents(placeResourceName: string): Promise<unknown> {
  const apiKey = getServerPlacesApiKey()
  if (!apiKey) {
    throw new Error('Google Places API key is not configured')
  }

  const response = await fetch(`https://places.googleapis.com/v1/${placeResourceName}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      Referer: getPlacesServerReferer(),
      'X-Goog-FieldMask': 'addressComponents,formattedAddress',
    },
  })

  const payload = await response.text()
  if (!response.ok) {
    throw new Error(`Places details failed (${response.status}): ${payload}`)
  }

  const data = JSON.parse(payload) as { addressComponents?: unknown }
  return data.addressComponents
}
