import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Resolve effective URL at runtime. In dev the client bundle is baked with
  // the build-time NEXT_PUBLIC_SUPABASE_URL; however a stale build or service
  // worker can cause a different/old host to be used (NXDOMAIN). To make
  // debugging and recovery easier we support a runtime override and a
  // defensive replacement of known-bad hosts.
  let effectiveUrl = url

  if (typeof window !== 'undefined') {
    // Allow an optional runtime override for quick debugging: set
    // `window.__SUPABASE_URL__ = 'https://your.supabase.co'` in the console
    // and the client will prefer it. This helps when the app was built with
    // the wrong value but you don't want to rebuild immediately.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtimeOverride = (window as any).__SUPABASE_URL__
    if (runtimeOverride) {
      effectiveUrl = runtimeOverride
      // eslint-disable-next-line no-console
      console.warn('[supabase] Using runtime override for NEXT_PUBLIC_SUPABASE_URL =', effectiveUrl)
    }

    // Defensive check: if the baked-in url looks wrong (common on NXDOMAIN)
    // but the current environment variable (build-time) is valid, prefer it.
    // This covers cases where a stale compiled asset contains an old host.
    if (effectiveUrl && typeof effectiveUrl === 'string' && effectiveUrl.includes('idpqgqbpmblchbakwyul')) {
      if (url && !url.includes('idpqgqbpmblchbakwyul')) {
        // eslint-disable-next-line no-console
        console.warn('[supabase] Detected bad baked-in Supabase host, replacing with NEXT_PUBLIC_SUPABASE_URL from env =', url)
        effectiveUrl = url
      } else {
        // eslint-disable-next-line no-console
        console.warn('[supabase] Detected bad Supabase host in runtime override or env:', effectiveUrl)
      }
    }

    // eslint-disable-next-line no-console
    console.debug('[supabase] Effective NEXT_PUBLIC_SUPABASE_URL =', effectiveUrl)
    // eslint-disable-next-line no-console
    console.debug('[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY (first 8 chars) =', key?.slice(0, 8))
  }

  return createBrowserClient(effectiveUrl!, key!)
}
