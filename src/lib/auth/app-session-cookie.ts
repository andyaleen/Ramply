import type { User } from '@supabase/supabase-js'
import type { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_SESSION_ABSOLUTE_TIMEOUT_MS,
  AUTH_SESSION_ACTIVITY_THROTTLE_MS,
  getSessionStartTimestamp,
  type StoredSessionMetadata,
} from '@/lib/auth/session-policy'

export const APP_SESSION_ACTIVITY_COOKIE = 'ramply.session-activity'

/** Cookie max-age tracks the absolute session window. */
export function getAppSessionActivityCookieMaxAgeSec(): number {
  return Math.ceil(AUTH_SESSION_ABSOLUTE_TIMEOUT_MS / 1000)
}

export function getAppSessionActivityCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getAppSessionActivityCookieMaxAgeSec(),
  }
}

/** Serialize session timing metadata for the httpOnly activity cookie. */
export function serializeAppSessionActivity(metadata: StoredSessionMetadata): string {
  return JSON.stringify(metadata)
}

/** Parse session timing metadata from the activity cookie value. */
export function parseAppSessionActivity(value: string | undefined): StoredSessionMetadata | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<StoredSessionMetadata>
    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.sessionStartedAt !== 'number' ||
      typeof parsed.lastActivityAt !== 'number'
    ) {
      return null
    }

    return {
      userId: parsed.userId,
      sessionStartedAt: parsed.sessionStartedAt,
      lastActivityAt: parsed.lastActivityAt,
    }
  } catch {
    return null
  }
}

/** Build initial session metadata after sign-in or when seeding a missing cookie. */
export function buildAppSessionActivityMetadata(user: Pick<User, 'id' | 'last_sign_in_at'>): StoredSessionMetadata {
  const now = Date.now()
  const startedAt = getSessionStartTimestamp(user.last_sign_in_at)

  return {
    userId: user.id,
    sessionStartedAt: startedAt,
    lastActivityAt: now,
  }
}

/** Read validated activity metadata for the signed-in user from a request cookie. */
export function readAppSessionActivityFromRequest(
  request: NextRequest,
  userId: string
): StoredSessionMetadata | null {
  const parsed = parseAppSessionActivity(request.cookies.get(APP_SESSION_ACTIVITY_COOKIE)?.value)
  if (!parsed || parsed.userId !== userId) return null
  return parsed
}

/** Attach refreshed activity metadata to a middleware or route-handler response. */
export function writeAppSessionActivityOnResponse(
  response: NextResponse,
  metadata: StoredSessionMetadata
): void {
  response.cookies.set(
    APP_SESSION_ACTIVITY_COOKIE,
    serializeAppSessionActivity(metadata),
    getAppSessionActivityCookieOptions()
  )
}

/** Clear the activity cookie on sign-out or session expiry. */
export function clearAppSessionActivityOnResponse(response: NextResponse): void {
  response.cookies.set(APP_SESSION_ACTIVITY_COOKIE, '', {
    ...getAppSessionActivityCookieOptions(),
    maxAge: 0,
  })
}

/**
 * Returns refreshed metadata when activity should be persisted, otherwise null.
 */
export function touchAppSessionActivityMetadata(
  metadata: StoredSessionMetadata,
  now = Date.now()
): StoredSessionMetadata | null {
  if (now - metadata.lastActivityAt < AUTH_SESSION_ACTIVITY_THROTTLE_MS) {
    return null
  }

  return {
    ...metadata,
    lastActivityAt: now,
  }
}

/** Idle timeout uses the activity cookie; absolute timeout also applies without one. */
export function resolveAppSessionMetadata(
  user: Pick<User, 'id' | 'last_sign_in_at'>,
  existing: StoredSessionMetadata | null
): StoredSessionMetadata {
  if (existing && existing.userId === user.id) {
    return existing
  }

  return buildAppSessionActivityMetadata(user)
}

export { AUTH_SESSION_IDLE_TIMEOUT_MS } from '@/lib/auth/session-policy'