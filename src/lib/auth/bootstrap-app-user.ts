import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { CompanyRow, UserRow } from '@/lib/database.types'
import { safeLowerCase } from '@/lib/utils'

export type BootstrapAppUserResult = {
  userProfile: UserRow
  company: CompanyRow
}

type BootstrapAppUserPayload = {
  user: UserRow
  company: CompanyRow
}

/** Parses the JSON payload returned by the `bootstrap_app_user` RPC. */
export function parseBootstrapAppUserPayload(data: unknown): BootstrapAppUserResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid bootstrap payload')
  }

  const payload = data as Partial<BootstrapAppUserPayload>
  if (!payload.user || !payload.company) {
    throw new Error('Missing user or company in bootstrap payload')
  }

  return {
    userProfile: payload.user,
    company: payload.company,
  }
}

/** True when the bootstrap RPC is missing or unavailable in the connected database. */
export function isBootstrapRpcUnavailable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false

  const message = error.message ?? ''
  return (
    error.code === 'PGRST202'
    || error.code === '42883'
    || /bootstrap_app_user/i.test(message)
    || /function .* does not exist/i.test(message)
  )
}

/** Client-side fallback when the bootstrap RPC has not been deployed yet. */
export async function bootstrapAppUserDirect(
  supabase: SupabaseClient,
  authUser: Pick<User, 'id' | 'email'>
): Promise<BootstrapAppUserResult> {
  const normalizedEmail = safeLowerCase(authUser.email)

  const { data: existingUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  if (userError) throw userError

  let resolvedUser = existingUser
  if (!resolvedUser) {
    const { data: createdUser, error: createUserError } = await supabase
      .from('users')
      .insert([{ id: authUser.id, email: normalizedEmail, role: 'external' }])
      .select()
      .single()

    if (createUserError && createUserError.code !== '23505') throw createUserError
    resolvedUser = createdUser ?? null
  }

  if (!resolvedUser) {
    const { data: reloadedUser, error: reloadUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (reloadUserError) throw reloadUserError
    resolvedUser = reloadedUser
  }

  if (safeLowerCase(resolvedUser.email) !== normalizedEmail && normalizedEmail) {
    const { data: updatedUser, error: updateUserError } = await supabase
      .from('users')
      .update({ email: normalizedEmail, updated_at: new Date().toISOString() })
      .eq('id', authUser.id)
      .select()
      .single()

    if (updateUserError) throw updateUserError
    resolvedUser = updatedUser
  }

  const { data: existingCompany, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_user_id', authUser.id)
    .maybeSingle()

  if (companyError) throw companyError

  let resolvedCompany = existingCompany
  if (!resolvedCompany) {
    const { data: createdCompany, error: createCompanyError } = await supabase
      .from('companies')
      .insert([{ owner_user_id: authUser.id }])
      .select()
      .single()

    if (createCompanyError && createCompanyError.code !== '23505') throw createCompanyError
    resolvedCompany = createdCompany ?? null
  }

  if (!resolvedCompany) {
    const { data: reloadedCompany, error: reloadCompanyError } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_user_id', authUser.id)
      .single()

    if (reloadCompanyError) throw reloadCompanyError
    resolvedCompany = reloadedCompany
  }

  return {
    userProfile: resolvedUser,
    company: resolvedCompany,
  }
}

/**
 * Ensures the signed-in user has app-owned user + company rows and returns them.
 * Falls back to direct table writes when the bootstrap RPC is unavailable.
 */
export async function bootstrapAppUser(
  supabase: SupabaseClient,
  authUser?: Pick<User, 'id' | 'email'>
): Promise<BootstrapAppUserResult> {
  let resolvedAuthUser = authUser

  if (!resolvedAuthUser) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw authError ?? new Error('Not authenticated')
    resolvedAuthUser = user
  }

  const { data, error } = await supabase.rpc('bootstrap_app_user')
  if (!error) {
    return parseBootstrapAppUserPayload(data)
  }

  if (!isBootstrapRpcUnavailable(error)) {
    throw error
  }

  return bootstrapAppUserDirect(supabase, resolvedAuthUser)
}
