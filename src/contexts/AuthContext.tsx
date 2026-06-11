'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { AuthError, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { CompanyRow, UserRow } from '@/lib/database.types'
import { fetchActiveVaultDocuments, vaultDocsQueryKey } from '@/lib/vault-documents'
import { bootstrapAppUser } from '@/lib/auth/bootstrap-app-user'
import { isCompanyProfileComplete, isProtectedAppPath } from '@/lib/auth/routing'
import { isUserOwnedLogoPath } from '@/lib/company-logo-upload'
import {
  AUTH_REDIRECT_REASON_SESSION_EXPIRED,
  clearStoredSessionMetadata,
} from '@/lib/auth/session-policy'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'

interface AuthContextType {
  user: User | null
  userProfile: UserRow | null
  company: CompanyRow | null
  loading: boolean
  profileLoading: boolean
  isProfileComplete: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  updateCompany: (data: Partial<CompanyRow>) => Promise<void>
  refreshUserProfile: () => Promise<void>
  seedBootstrapState: (state: BootstrapState) => void
  isAdmin: boolean
  promoteToAdmin: (userId: string) => Promise<{ error: string | null }>
}

type BootstrapState = {
  userProfile: UserRow | null
  company: CompanyRow | null
}

type SignOutOptions = {
  redirectTo?: string
  scope?: 'global' | 'local' | 'others'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Upper bound for the initial profile/company fetch. Past this window we stop
// blocking the UI so the user sees either the underlying page or the
// LoadingFallback's built-in "Try again" prompt instead of an indefinite spin.
const BOOTSTRAP_TIMEOUT_MS = 12_000

/**
 * Resolves the application's user/profile/company state from the current
 * Supabase session without blocking basic authentication on profile creation.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserRow | null>(null)
  const [company, setCompany] = useState<CompanyRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const bootstrapRef = useRef<{ userId: string; promise: Promise<BootstrapState> } | null>(null)
  // Tracks which user we've already fully bootstrapped so tab-focus events
  // (TOKEN_REFRESHED / redundant SIGNED_IN) don't re-trigger profileLoading
  // and flash the "Preparing Your Workspace" screen on top of the app.
  const bootstrappedUserIdRef = useRef<string | null>(null)

  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }

  const supabase = supabaseRef.current

  /**
   * Fetches or creates the app-owned rows that sit behind an authenticated user.
   *
   * When `silent` is true (e.g. a background refresh after tab refocus) we
   * skip toggling `profileLoading` so the shell keeps rendering the current
   * page instead of swapping to the full-screen loading fallback.
   */
  const bootstrapUserState = useCallback(
    async (authUser: User, options?: { silent?: boolean }): Promise<BootstrapState> => {
      const silent = options?.silent ?? false
      const existingBootstrap = bootstrapRef.current
      if (existingBootstrap?.userId === authUser.id) {
        return existingBootstrap.promise
      }

      const bootstrapPromise = (async () => {
        if (!silent) setProfileLoading(true)
        try {
          const { userProfile: resolvedUser, company: resolvedCompany } =
            await bootstrapAppUser(supabase)

          setUserProfile(resolvedUser)
          setCompany(resolvedCompany)
          bootstrappedUserIdRef.current = authUser.id

          if (resolvedCompany.id) {
            void queryClient.prefetchQuery({
              queryKey: vaultDocsQueryKey(resolvedCompany.id),
              queryFn: () => fetchActiveVaultDocuments(supabase, resolvedCompany.id),
            })
          }

          return {
            userProfile: resolvedUser,
            company: resolvedCompany,
          }
        } finally {
          if (!silent) setProfileLoading(false)
          if (bootstrapRef.current?.userId === authUser.id) {
            bootstrapRef.current = null
          }
        }
      })()

      // Safety net: if Supabase hangs, release the UI after BOOTSTRAP_TIMEOUT_MS
      // so the shell either renders the existing page (when we already had
      // data) or the LoadingFallback's "Try again" state kicks in.
      const racedPromise = silent
        ? bootstrapPromise
        : Promise.race([
            bootstrapPromise,
            new Promise<BootstrapState>((_resolve, reject) => {
              setTimeout(
                () => reject(new Error('Profile bootstrap timed out')),
                BOOTSTRAP_TIMEOUT_MS,
              )
            }),
          ]).catch((err) => {
            console.warn('bootstrapUserState:', err)
            setProfileLoading(false)
            throw err
          })

      bootstrapRef.current = {
        userId: authUser.id,
        promise: bootstrapPromise,
      }

      return racedPromise
    },
    [queryClient, supabase]
  )

  useEffect(() => {
    let mounted = true

    const initializeSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        const sessionUser = session?.user ?? null
        setUser(sessionUser)
        setLoading(false)

        if (sessionUser) {
          void bootstrapUserState(sessionUser)
        } else {
          setUserProfile(null)
          setCompany(null)
        }
      } catch (err) {
        console.error('Error getting session:', err)
        if (mounted) {
          setUser(null)
          setUserProfile(null)
          setCompany(null)
          setLoading(false)
        }
      }
    }

    void initializeSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      setLoading(false)

      if (!sessionUser) {
        bootstrapRef.current = null
        bootstrappedUserIdRef.current = null
        setUserProfile(null)
        setCompany(null)
        setProfileLoading(false)
        return
      }

      // TOKEN_REFRESHED (and sometimes SIGNED_IN) fires every time the tab
      // regains focus. If we've already fully bootstrapped for this user,
      // don't flip profileLoading — that's what was flashing the
      // "Preparing Your Workspace" screen on every tab return. USER_UPDATED
      // is the one case where we still want to refetch, but silently so the
      // page underneath stays mounted.
      const alreadyBootstrapped = bootstrappedUserIdRef.current === sessionUser.id

      if (alreadyBootstrapped && event !== 'USER_UPDATED' && event !== 'SIGNED_OUT') {
        return
      }

      void bootstrapUserState(sessionUser, { silent: alreadyBootstrapped })
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [bootstrapUserState, supabase])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    [supabase]
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({ email, password })
      return { error }
    },
    [supabase]
  )

  /**
   * Clears the local auth view model immediately so protected UI fails closed.
   */
  const resetAuthState = useCallback(() => {
    bootstrapRef.current = null
    bootstrappedUserIdRef.current = null
    setUser(null)
    setUserProfile(null)
    setCompany(null)
    setLoading(false)
    setProfileLoading(false)
    clearStoredSessionMetadata()
  }, [])

  /**
   * Ends the active Supabase session and optionally redirects the browser.
   */
  const performSignOut = useCallback(async (options?: SignOutOptions) => {
    resetAuthState()

    try {
      await supabase.auth.signOut(options ? { scope: options.scope } : undefined)
    } catch (err) {
      console.warn('Sign out error:', err)
    }

    if (options?.redirectTo && typeof window !== 'undefined') {
      window.location.replace(options.redirectTo)
    }
  }, [resetAuthState, supabase])

  const signOut = useCallback(async () => {
    await performSignOut({ scope: 'global' })
  }, [performSignOut])

  /**
   * Forces a local-device reauthentication when idle or absolute limits are reached.
   */
  const expireSession = useCallback(async () => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
    const search = typeof window !== 'undefined' ? window.location.search : ''
    const reason = `reason=${AUTH_REDIRECT_REASON_SESSION_EXPIRED}`
    const redirectTo = isProtectedAppPath(pathname)
      ? `/login?${reason}&redirect=${encodeURIComponent(`${pathname}${search}`)}`
      : pathname === '/'
        ? '/'
        : `/login?${reason}`

    await performSignOut({
      redirectTo,
      scope: 'global',
    })
  }, [performSignOut])

  useSessionTimeout({
    userId: user?.id ?? null,
    lastSignInAt: user?.last_sign_in_at,
    onExpire: expireSession,
  })

  /**
   * Persists company changes for the signed-in user and updates local context.
   */
  const updateCompany = useCallback(
    async (data: Partial<CompanyRow>) => {
      if (!user) {
        throw new Error('Not authenticated')
      }

      if (
        data.logo_path != null &&
        !isUserOwnedLogoPath(data.logo_path, user.id)
      ) {
        throw new Error('Invalid company logo path')
      }

      const { data: updated, error } = await supabase
        .from('companies')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('owner_user_id', user.id)
        .select()
        .single()

      if (error) throw error
      setCompany(updated)
    },
    [supabase, user]
  )

  const refreshUserProfile = useCallback(async () => {
    if (!user) return
    await bootstrapUserState(user)
  }, [bootstrapUserState, user])

  const seedBootstrapState = useCallback(
    (state: BootstrapState) => {
      setUserProfile(state.userProfile)
      setCompany(state.company)
      if (state.userProfile?.id) {
        bootstrappedUserIdRef.current = state.userProfile.id
      }

      if (state.company?.id) {
        void queryClient.prefetchQuery({
          queryKey: vaultDocsQueryKey(state.company.id),
          queryFn: () => fetchActiveVaultDocuments(supabase, state.company!.id),
        })
      }
    },
    [queryClient, supabase]
  )

  const promoteToAdmin = useCallback(
    async (userId: string) => {
      if (userProfile?.role !== 'admin') {
        return { error: 'Only admins can promote users' }
      }

      const { error } = await supabase.rpc('set_user_role', {
        p_role: 'admin',
        p_user_id: userId,
      })

      return { error: error?.message ?? null }
    },
    [supabase, userProfile?.role]
  )

  const contextValue = useMemo(
    () => ({
      user,
      userProfile,
      company,
      loading,
      profileLoading,
      isProfileComplete: isCompanyProfileComplete(company),
      signIn,
      signUp,
      signOut,
      updateCompany,
      refreshUserProfile,
      seedBootstrapState,
      isAdmin: userProfile?.role === 'admin',
      promoteToAdmin,
    }),
    [
      company,
      loading,
      profileLoading,
      promoteToAdmin,
      refreshUserProfile,
      seedBootstrapState,
      signIn,
      signOut,
      signUp,
      updateCompany,
      user,
      userProfile,
    ]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
