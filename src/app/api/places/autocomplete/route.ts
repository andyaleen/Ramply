import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  fetchPlaceAutocompleteSuggestions,
  isServerPlacesConfigured,
} from '@/lib/places-api-server'
import { enforcePublicRateLimit } from '@/lib/rate-limit/public-rate-limits'

const AutocompleteSchema = z.object({
  input: z.string().trim().min(3).max(200),
})

/** Whether server-side Places autocomplete is available. */
export async function GET() {
  return NextResponse.json({ enabled: isServerPlacesConfigured() })
}

/** Proxy Places autocomplete so browser referrer restrictions do not block www production. */
export async function POST(req: Request) {
  const rateLimit = await enforcePublicRateLimit(req, 'places-autocomplete')
  if (!rateLimit.ok) {
    return rateLimit.response
  }

  if (!isServerPlacesConfigured()) {
    return NextResponse.json({ error: 'Places autocomplete is not configured' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = AutocompleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const suggestions = await fetchPlaceAutocompleteSuggestions(parsed.data.input)
    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ error: 'Autocomplete failed' }, { status: 502 })
  }
}
