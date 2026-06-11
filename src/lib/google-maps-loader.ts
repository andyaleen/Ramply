import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null
let resolvedApiKeyPromise: Promise<string | undefined> | null = null
let cachedResolvedApiKey: string | undefined

function normalizePublicEnv(value: string | undefined): string | undefined {
  const raw = value?.trim()
  if (!raw) return undefined

  if (
    (raw.startsWith('"') && raw.endsWith('"'))
    || (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1).trim() || undefined
  }

  return raw
}

/** Read the public Google Places key. Uses static env access for Next.js client inlining. */
export function getGooglePlacesApiKey(): string | undefined {
  return normalizePublicEnv(process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY)
}

/** Whether Google Places autocomplete can run in this environment (sync, build-inlined key only). */
export function isGooglePlacesConfigured(): boolean {
  return Boolean(getGooglePlacesApiKey())
}

/** Reset cached library load state (for tests or retry after failure). */
export function resetGooglePlacesLibraryCache(): void {
  placesLibraryPromise = null
  resolvedApiKeyPromise = null
  cachedResolvedApiKey = undefined
}

/** Resolve the Places API key from the bundle or server runtime config. */
export async function resolveGooglePlacesApiKey(): Promise<string | undefined> {
  const inlined = getGooglePlacesApiKey()
  if (inlined) {
    cachedResolvedApiKey = inlined
    return inlined
  }

  if (cachedResolvedApiKey) {
    return cachedResolvedApiKey
  }

  if (!resolvedApiKeyPromise) {
    resolvedApiKeyPromise = fetch('/api/config/public', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) return undefined
        const payload = (await response.json()) as { googlePlacesApiKey?: string | null }
        return normalizePublicEnv(payload.googlePlacesApiKey ?? undefined)
      })
      .catch(() => undefined)
      .finally(() => {
        resolvedApiKeyPromise = null
      })
  }

  const key = await resolvedApiKeyPromise
  if (key) {
    cachedResolvedApiKey = key
  }
  return key
}

/** Load the Google Maps Places library once per browser session. */
export async function loadGooglePlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  if (placesLibraryPromise) return placesLibraryPromise

  const apiKey = await resolveGooglePlacesApiKey()
  if (!apiKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is not configured'))
  }

  setOptions({
    key: apiKey,
    v: 'weekly',
    libraries: ['places'],
  })

  placesLibraryPromise = importLibrary('places').then(
    (library) => library as google.maps.PlacesLibrary,
    (error) => {
      placesLibraryPromise = null
      throw error
    }
  )

  return placesLibraryPromise
}
