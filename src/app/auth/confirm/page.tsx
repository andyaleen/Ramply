'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AUTH_UPDATE_PASSWORD_PATH } from '@/lib/auth/auth-redirect'
import { completeAuthCallback } from '@/lib/auth/complete-auth-callback'
import { createClient } from '@/lib/supabase/client'
import {
  getAuthCallbackParamsFromLocation,
  hasAuthCallbackParams,
} from '@/lib/auth/parse-auth-callback-params'

/**
 * Client-side auth confirmation — handles PKCE codes, token_hash, and hash tokens.
 */
function AuthConfirmContent() {
  const router = useRouter()
  const startedRef = useRef(false)
  const [status, setStatus] = useState('Completing sign-in…')

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const run = async () => {
      const params = getAuthCallbackParamsFromLocation()

      if (!hasAuthCallbackParams(params)) {
        setStatus('No sign-in data found in this link.')
        router.replace(
          `/auth/auth-code-error?error=${encodeURIComponent(
            'This link is missing sign-in data. Request a new password reset from https://www.ramply.org/login (same browser).'
          )}`
        )
        return
      }

      const supabase = createClient()
      let recoveryFlow = params.get('type') === 'recovery'

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          recoveryFlow = true
        }
      })

      const result = await completeAuthCallback(supabase, params)
      subscription.unsubscribe()

      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }

      if (!result.ok) {
        router.replace(`/auth/auth-code-error?error=${encodeURIComponent(result.error)}`)
        return
      }

      const destination = recoveryFlow ? AUTH_UPDATE_PASSWORD_PATH : result.nextPath
      router.replace(destination)
      router.refresh()
    }

    void run()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0EFE9] p-4">
      <p className="text-[#5D6D66]">{status}</p>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F0EFE9] p-4">
          <p className="text-[#5D6D66]">Loading…</p>
        </div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  )
}
