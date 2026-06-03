import type { SupabaseClient, User } from '@supabase/supabase-js'
import { safeLowerCase } from '@/lib/utils'

/**
 * Resolves an auth user id by email (app users table first, then auth admin list).
 */
export async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalized = safeLowerCase(email)
  if (!normalized) return null

  const { data: appUser } = await admin
    .from('users')
    .select('id')
    .ilike('email', normalized)
    .maybeSingle()

  if (appUser?.id) return appUser.id

  let page = 1
  const perPage = 200

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) return null

    const match = data.users.find((user) => safeLowerCase(user.email) === normalized)
    if (match?.id) return match.id

    if (data.users.length < perPage) return null
    page += 1
  }

  return null
}

/**
 * Loads the Supabase auth user for an email when possible.
 */
export async function getAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
  userId?: string
): Promise<User | null> {
  const resolvedUserId = userId ?? (await findAuthUserIdByEmail(admin, email))
  if (!resolvedUserId) return null

  const { data, error } = await admin.auth.admin.getUserById(resolvedUserId)
  if (error || !data.user) return null

  const normalized = safeLowerCase(email)
  if (safeLowerCase(data.user.email) !== normalized) return null

  return data.user
}

export function authUserHasPasswordProvider(user: User | null): boolean {
  return Boolean(user?.identities?.some((identity) => identity.provider === 'email'))
}
