import { NextResponse } from 'next/server'
import { getGooglePlacesApiKey } from '@/lib/google-maps-loader'

/**
 * Public runtime config for client features that need env vars not present
 * in an older production bundle (NEXT_PUBLIC_* is inlined at build time).
 */
export async function GET() {
  return NextResponse.json({
    googlePlacesApiKey: getGooglePlacesApiKey() ?? null,
  })
}
