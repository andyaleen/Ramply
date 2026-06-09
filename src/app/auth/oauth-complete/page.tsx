'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { applyClientAuthSession } from '@/lib/auth/apply-client-auth-session'
import { normalizeRequestedPath } from '@/lib/auth/routing'
import { createClient } from '@/lib/supabase/client'

/** Mirrors the server OAuth session into the browser client after /auth/callback. */
function OAuthCompleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const startedRef = useRef(false)
  const [status, setStatus] = useState('Completing Google sign-in…')

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const run = async () => {
      const next = normalizeRequestedPath(searchParams.get('next'), '/dashboard')

      try {
        const res = await fetch('/api/auth/sync-session', { credentials: 'include' })
        const payload = await res.json() as {
          session?: { access_token: string; refresh_token: string }
          error?: string
        }

        if (!res.ok || !payload.session) {
          throw new Error(payload.error ?? 'No active session')
        }

        await applyClientAuthSession(createClient(), payload.session)
        router.replace(next)
        router.refresh()
      } catch {
        setStatus('Sign-in could not be completed.')
        router.replace(`/login?redirect=${encodeURIComponent(next)}`)
      }
    }

    void run()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0EFE9] p-4">
      <p className="text-[#5D6D66]">{status}</p>
    </div>
  )
}

export default function OAuthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F0EFE9] p-4">
          <p className="text-[#5D6D66]">Loading…</p>
        </div>
      }
    >
      <OAuthCompleteContent />
    </Suspense>
  )
}
