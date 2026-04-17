import type { CompanyRow, UserRow } from '@/lib/database.types'

type MinimalUserProfile = Pick<UserRow, 'role'> | null | undefined
type MinimalCompany = Pick<CompanyRow, 'legal_name' | 'contact_name'> | null | undefined

const INVALID_NEXT_PREFIXES = ['/auth/', '/login', '/signup', '/post-login']

export function isCompanyProfileComplete(company: MinimalCompany): boolean {
  return Boolean(company?.legal_name?.trim() && company?.contact_name?.trim())
}

export function getDefaultAuthenticatedPath(userProfile: MinimalUserProfile): string {
  return userProfile?.role === 'admin' ? '/admin' : '/dashboard'
}

export function normalizeRequestedPath(requestedPath: string | null | undefined, fallbackPath: string): string {
  if (!requestedPath || !requestedPath.startsWith('/')) {
    return fallbackPath
  }

  const isInvalidNextPath = INVALID_NEXT_PREFIXES.some(
    (prefix) => requestedPath === prefix || requestedPath.startsWith(`${prefix}/`)
  )

  return isInvalidNextPath ? fallbackPath : requestedPath
}

export function getAuthorizedAppPath(requestedPath: string | null | undefined, userProfile: MinimalUserProfile): string {
  const fallbackPath = getDefaultAuthenticatedPath(userProfile)
  const normalizedPath = normalizeRequestedPath(requestedPath, fallbackPath)

  if (userProfile?.role === 'admin') {
    return normalizedPath.startsWith('/dashboard') ? '/admin' : normalizedPath
  }

  return normalizedPath.startsWith('/admin') ? '/dashboard' : normalizedPath
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
