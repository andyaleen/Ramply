'use client'

import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  AUTH_SESSION_ACTIVITY_THROTTLE_MS,
  AUTH_SESSION_CHECK_INTERVAL_MS,
  AUTH_SESSION_WARNING_WINDOW_MS,
  SessionExpiryReason,
  clearStoredSessionMetadata,
  getSessionStartTimestamp,
  getSessionTimeoutState,
  readStoredSessionMetadata,
  writeStoredSessionMetadata,
} from '@/lib/auth/session-policy'

interface UseSessionTimeoutOptions {
  userId: string | null
  lastSignInAt?: string | null
  onExpire: (reason: SessionExpiryReason) => Promise<void> | void
}

const SESSION_TIMEOUT_TOAST_ID = 'session-timeout-warning'

/**
 * Tracks user activity and enforces idle plus absolute session limits in the browser.
 */
export function useSessionTimeout({
  userId,
  lastSignInAt,
  onExpire,
}: UseSessionTimeoutOptions) {
  const expiringRef = useRef(false)
  const warningReasonRef = useRef<SessionExpiryReason | null>(null)
  const metadataRef = useRef<ReturnType<typeof readStoredSessionMetadata>>(null)

  const dismissWarning = useCallback(() => {
    toast.dismiss(SESSION_TIMEOUT_TOAST_ID)
    warningReasonRef.current = null
  }, [])

  const expireSession = useCallback(
    async (reason: SessionExpiryReason) => {
      if (expiringRef.current) return

      expiringRef.current = true
      dismissWarning()

      try {
        await onExpire(reason)
      } finally {
        expiringRef.current = false
      }
    },
    [dismissWarning, onExpire]
  )

  useEffect(() => {
    if (!userId) {
      metadataRef.current = null
      dismissWarning()
      clearStoredSessionMetadata()
      return
    }

    const now = Date.now()
    const existing = readStoredSessionMetadata()
    const startedAt = getSessionStartTimestamp(lastSignInAt)

    const nextMetadata =
      existing && existing.userId === userId
        ? {
            ...existing,
            sessionStartedAt: Math.min(existing.sessionStartedAt, startedAt),
          }
        : {
            userId,
            sessionStartedAt: startedAt,
            lastActivityAt: now,
          }

    metadataRef.current = nextMetadata
    writeStoredSessionMetadata(nextMetadata)

    let lastPersistedActivityAt = nextMetadata.lastActivityAt

    /**
     * Records recent user activity without hammering local storage.
     */
    const markActivity = () => {
      const currentMetadata = metadataRef.current
      if (!currentMetadata || currentMetadata.userId !== userId) return

      const activityAt = Date.now()
      if (activityAt - lastPersistedActivityAt < AUTH_SESSION_ACTIVITY_THROTTLE_MS) {
        dismissWarning()
        return
      }

      const updatedMetadata = {
        ...currentMetadata,
        lastActivityAt: activityAt,
      }

      metadataRef.current = updatedMetadata
      lastPersistedActivityAt = activityAt
      writeStoredSessionMetadata(updatedMetadata)
      dismissWarning()
    }

    /**
     * Evaluates whether the current session should warn or expire.
     */
    const evaluateSession = () => {
      const currentMetadata = metadataRef.current
      if (!currentMetadata || currentMetadata.userId !== userId) return

      const state = getSessionTimeoutState(currentMetadata)
      if (state.shouldExpire) {
        if (state.reason) {
          void expireSession(state.reason)
        }
        return
      }

      if (!state.reason) {
        dismissWarning()
        return
      }

      if (warningReasonRef.current === state.reason) {
        return
      }

      const roundedMinutes = Math.max(
        1,
        Math.ceil(Math.min(state.remainingMs, AUTH_SESSION_WARNING_WINDOW_MS) / 60_000)
      )
      const message =
        state.reason === 'idle'
          ? `You'll be signed out in about ${roundedMinutes} minute${roundedMinutes === 1 ? '' : 's'} unless you stay active.`
          : `For security, Ramply will ask you to sign in again in about ${roundedMinutes} minute${roundedMinutes === 1 ? '' : 's'}.`

      toast.warning(message, {
        id: SESSION_TIMEOUT_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
      })
      warningReasonRef.current = state.reason
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'focus',
    ]

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markActivity()
        evaluateSession()
      }
    }

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true })
    })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const intervalId = window.setInterval(evaluateSession, AUTH_SESSION_CHECK_INTERVAL_MS)
    evaluateSession()

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearInterval(intervalId)
      dismissWarning()
    }
  }, [dismissWarning, expireSession, lastSignInAt, userId])
}
