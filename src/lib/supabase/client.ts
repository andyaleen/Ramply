import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Resolve effective URL at runtime. In dev the client bundle is baked with
  // the build-time NEXT_PUBLIC_SUPABASE_URL; however a stale build or service
  // worker can cause a different/old host to be used (NXDOMAIN). To make
  // debugging and recovery easier we support a runtime override and a
  // defensive replacement of known-bad hosts.
  let effectiveUrl = url

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Dev-only: optional runtime override for debugging stale builds.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtimeOverride = (window as any).__SUPABASE_URL__
    if (runtimeOverride) {
      effectiveUrl = runtimeOverride
      console.warn('[supabase] Using runtime override for NEXT_PUBLIC_SUPABASE_URL =', effectiveUrl)
    }

    if (effectiveUrl && typeof effectiveUrl === 'string' && effectiveUrl.includes('idpqgqbpmblchbakwyul')) {
      if (url && !url.includes('idpqgqbpmblchbakwyul')) {
        console.warn('[supabase] Detected bad baked-in Supabase host, replacing with env URL')
        effectiveUrl = url
      }
    }
  }

  if (!browserClient) {
    browserClient = createBrowserClient(effectiveUrl!, key!, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
      },
    })
  }

  return browserClient
}
