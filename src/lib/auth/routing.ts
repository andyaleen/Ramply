import type { CompanyRow, UserRow } from '@/lib/database.types'

type MinimalUserProfile = Pick<UserRow, 'role'> | null | undefined
type MinimalCompany = Pick<CompanyRow, 'legal_name' | 'contact_name' | 'ein'> | null | undefined

const INVALID_NEXT_PREFIXES = ['/auth/', '/login', '/signup', '/post-login']

/**
 * Returns true when path is a same-origin relative path safe for redirects.
 * Rejects protocol-relative URLs (//), backslashes, and colon-based schemes.
 */
export function isSafeRedirectPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes(':')) {
    return false
  }
  return true
}
const PROTECTED_APP_PREFIXES = ['/dashboard', '/admin']
const PROTECTED_APP_PATHS = new Set(['/complete-profile', '/post-login', '/promote', '/signout'])

/** Mapping from legacy /admin/* paths to their /dashboard/* equivalents. */
const LEGACY_ADMIN_PATH_MAP: Record<string, string> = {
  '/admin': '/dashboard',
  '/admin/send-links': '/dashboard/send-links',
  '/admin/responses': '/dashboard/responses',
  '/admin/templates': '/dashboard/templates',
  '/admin/billing': '/dashboard/billing',
  '/admin/settings': '/dashboard/settings',
  '/admin/request-types': '/dashboard',
}

export function isCompanyProfileComplete(company: MinimalCompany): boolean {
  return Boolean(
    company?.legal_name?.trim()
    && company?.contact_name?.trim()
    && company?.ein?.trim()
  )
}

export function isProtectedAppPath(pathname: string): boolean {
  return (
    PROTECTED_APP_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PROTECTED_APP_PATHS.has(pathname)
  )
}

/**
 * All authenticated users land on /dashboard. Role-based routing has been
 * collapsed — /admin is retired in favor of a single unified dashboard.
 * The userProfile argument is retained for signature compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getDefaultAuthenticatedPath(userProfile: MinimalUserProfile): string {
  return '/dashboard'
}

/**
 * Translate a legacy /admin/* path to its /dashboard/* equivalent, preserving
 * trailing segments (e.g. `/admin/responses/123` → `/dashboard/responses/123`).
 */
function rewriteLegacyAdminPath(path: string): string {
  if (path === '/admin') return '/dashboard'

  const direct = LEGACY_ADMIN_PATH_MAP[path]
  if (direct) return direct

  if (path.startsWith('/admin/')) {
    return `/dashboard/${path.slice('/admin/'.length)}`
  }

  return path
}

export function normalizeRequestedPath(requestedPath: string | null | undefined, fallbackPath: string): string {
  if (!requestedPath || !isSafeRedirectPath(requestedPath)) {
    return fallbackPath
  }

  const isInvalidNextPath = INVALID_NEXT_PREFIXES.some(
    (prefix) => requestedPath === prefix || requestedPath.startsWith(`${prefix}/`)
  )

  if (isInvalidNextPath) return fallbackPath

  // Silently rewrite legacy /admin/* paths into /dashboard/* equivalents.
  return rewriteLegacyAdminPath(requestedPath)
}

export function getAuthorizedAppPath(requestedPath: string | null | undefined, userProfile: MinimalUserProfile): string {
  const fallbackPath = getDefaultAuthenticatedPath(userProfile)
  return normalizeRequestedPath(requestedPath, fallbackPath)
}

export function getPostLoginDestination(
  requestedPath: string | null | undefined,
  userProfile: MinimalUserProfile,
  company: MinimalCompany
): string {
  const authorizedPath = getAuthorizedAppPath(requestedPath, userProfile)

  if (!isCompanyProfileComplete(company)) {
    return `/complete-profile?next=${encodeURIComponent(authorizedPath)}`
  }

  return authorizedPath
}

export function getProtectedRouteRedirect(
  pathname: string,
  userProfile: MinimalUserProfile,
  company: MinimalCompany
): string | null {
  const authorizedPath = getAuthorizedAppPath(pathname, userProfile)

  if (authorizedPath !== pathname) {
    return authorizedPath
  }

  if (!isCompanyProfileComplete(company)) {
    return `/complete-profile?next=${encodeURIComponent(pathname)}`
  }

  return null
}
