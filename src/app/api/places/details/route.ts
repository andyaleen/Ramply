import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchPlaceAddressComponents, isServerPlacesConfigured } from '@/lib/places-api-server'

const DetailsQuerySchema = z.object({
  place: z.string().trim().min(1).max(300),
})

/** Proxy Places details for a selected autocomplete suggestion. */
export async function GET(req: Request) {
  if (!isServerPlacesConfigured()) {
    return NextResponse.json({ error: 'Places autocomplete is not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = DetailsQuerySchema.safeParse({ place: searchParams.get('place') })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const addressComponents = await fetchPlaceAddressComponents(parsed.data.place)
    return NextResponse.json({ addressComponents })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Place details failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
