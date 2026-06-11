import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import {
  APP_SESSION_ACTIVITY_COOKIE,
  buildAppSessionActivityMetadata,
  getAppSessionActivityCookieOptions,
  parseAppSessionActivity,
  resolveAppSessionMetadata,
  serializeAppSessionActivity,
  touchAppSessionActivityMetadata,
} from '@/lib/auth/app-session-cookie'
import {
  AUTH_REDIRECT_REASON_SESSION_EXPIRED,
  getSessionTimeoutState,
  isAbsoluteAppSessionExpired,
  type StoredSessionMetadata,
} from '@/lib/auth/session-policy'

export const APP_SESSION_EXPIRED_CODE = 'SESSION_EXPIRED'

type RequireAppSessionSuccess = {
  ok: true
  user: User
}

type RequireAppSessionFailure = {
  ok: false
  response: NextResponse
}

export type RequireAppSessionResult = RequireAppSessionSuccess | RequireAppSessionFailure

function sessionExpiredResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'Your session expired for security reasons. Please sign in again.',
      code: APP_SESSION_EXPIRED_CODE,
      reason: AUTH_REDIRECT_REASON_SESSION_EXPIRED,
    },
    { status: 401 }
  )
}

async function clearAppSessionActivityCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(APP_SESSION_ACTIVITY_COOKIE, '', {
    ...getAppSessionActivityCookieOptions(),
    maxAge: 0,
  })
}

async function persistAppSessionActivity(metadata: StoredSessionMetadata): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(
    APP_SESSION_ACTIVITY_COOKIE,
    serializeAppSessionActivity(metadata),
    getAppSessionActivityCookieOptions()
  )
}

/**
 * Validates Supabase auth plus Ramply idle/absolute session policy for API routes.
 */
export async function requireAppSession(
  supabase: SupabaseClient,
  existingUser?: User | null
): Promise<RequireAppSessionResult> {
  const user =
    existingUser ??
    (await supabase.auth.getUser()).data.user

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (isAbsoluteAppSessionExpired(user)) {
    try {
      await supabase.auth.signOut()
    } catch {
      // Best-effort cleanup when the JWT is already invalid.
    }
    await clearAppSessionActivityCookie()
    return { ok: false, response: sessionExpiredResponse() }
  }

  const cookieStore = await cookies()
  const cookieMetadata = parseAppSessionActivity(
    cookieStore.get(APP_SESSION_ACTIVITY_COOKIE)?.value
  )
  const metadata = resolveAppSessionMetadata(user, cookieMetadata)
  const timeoutState = getSessionTimeoutState(metadata)

  if (timeoutState.shouldExpire) {
    try {
      await supabase.auth.signOut()
    } catch {
      // Best-effort cleanup when the JWT is already invalid.
    }
    await clearAppSessionActivityCookie()
    return { ok: false, response: sessionExpiredResponse() }
  }

  const refreshedMetadata = touchAppSessionActivityMetadata(metadata) ?? metadata
  await persistAppSessionActivity(refreshedMetadata)

  return { ok: true, user }
}

/** Seeds the httpOnly activity cookie immediately after a successful sign-in. */
export async function seedAppSessionActivityCookie(user: User): Promise<void> {
  await persistAppSessionActivity(buildAppSessionActivityMetadata(user))
}

/** Middleware helper: evaluate session policy using request cookies. */
export function evaluateAppSessionForRequest(
  user: User,
  request: import('next/server').NextRequest,
  now = Date.now()
):
  | { ok: true; metadata: StoredSessionMetadata; refreshMetadata: StoredSessionMetadata | null }
  | { ok: false } {
  if (isAbsoluteAppSessionExpired(user, now)) {
    return { ok: false }
  }

  const cookieMetadata = parseAppSessionActivity(
    request.cookies.get(APP_SESSION_ACTIVITY_COOKIE)?.value
  )
  const metadata = resolveAppSessionMetadata(user, cookieMetadata)
  const timeoutState = getSessionTimeoutState(metadata, now)

  if (timeoutState.shouldExpire) {
    return { ok: false }
  }

  return {
    ok: true,
    metadata,
    refreshMetadata: touchAppSessionActivityMetadata(metadata, now),
  }
}
