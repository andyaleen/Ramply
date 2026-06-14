import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  fetchPlaceAddressComponents,
  isServerPlacesConfigured,
  isValidPlaceResourceName,
} from '@/lib/places-api-server'
import { enforcePublicRateLimit } from '@/lib/rate-limit/public-rate-limits'

const DetailsQuerySchema = z.object({
  place: z.string().trim().min(1).max(300),
})

/** Proxy Places details for a selected autocomplete suggestion. */
export async function GET(req: Request) {
  const rateLimit = await enforcePublicRateLimit(req, 'places-details')
  if (!rateLimit.ok) {
    return rateLimit.response
  }

  if (!isServerPlacesConfigured()) {
    return NextResponse.json({ error: 'Places autocomplete is not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = DetailsQuerySchema.safeParse({ place: searchParams.get('place') })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (!isValidPlaceResourceName(parsed.data.place)) {
    return NextResponse.json({ error: 'Invalid place resource name' }, { status: 400 })
  }

  try {
    const addressComponents = await fetchPlaceAddressComponents(parsed.data.place)
    return NextResponse.json({ addressComponents })
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid place resource name') {
      return NextResponse.json({ error: 'Invalid place resource name' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Place details failed' }, { status: 502 })
  }
}
