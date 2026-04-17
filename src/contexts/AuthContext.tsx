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
import { createClient } from '@/lib/supabase/client'
import type { CompanyRow, UserRow } from '@/lib/database.types'
import { isCompanyProfileComplete } from '@/lib/auth/routing'

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
  isAdmin: boolean
  promoteToAdmin: (userId: string) => Promise<{ error: string | null }>
}

type BootstrapState = {
  userProfile: UserRow | null
  company: CompanyRow | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Resolves the application's user/profile/company state from the current
 * Supabase session without blocking basic authentication on profile creation.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserRow | null>(null)
  const [company, setCompany] = useState<CompanyRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const bootstrapRef = useRef<{ userId: string; promise: Promise<BootstrapState> } | null>(null)

  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }

  const supabase = supabaseRef.current

  /**
   * Fetches or creates the app-owned rows that sit behind an authenticated user.
   */
  const bootstrapUserState = useCallback(
    async (authUser: User): Promise<BootstrapState> => {
      const existingBootstrap = bootstrapRef.current
      if (existingBootstrap?.userId === authUser.id) {
        return existingBootstrap.promise
      }

      const bootstrapPromise = (async () => {
        setProfileLoading(true)
        try {
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
              .insert([{ id: authUser.id, email: authUser.email ?? '', role: 'external' }])
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

          setUserProfile(resolvedUser)
          setCompany(resolvedCompany)

          return {
            userProfile: resolvedUser,
            company: resolvedCompany,
          }
        } finally {
          setProfileLoading(false)
          if (bootstrapRef.current?.userId === authUser.id) {
            bootstrapRef.current = null
          }
        }
      })()

      bootstrapRef.current = {
        userId: authUser.id,
        promise: bootstrapPromise,
      }

      return bootstrapPromise
    },
    [supabase]
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      setLoading(false)

      if (!sessionUser) {
        bootstrapRef.current = null
        setUserProfile(null)
        setCompany(null)
        setProfileLoading(false)
        return
      }

      void bootstrapUserState(sessionUser)
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

  const signOut = useCallback(async () => {
    bootstrapRef.current = null
    setUser(null)
    setUserProfile(null)
    setCompany(null)
    setLoading(false)
    setProfileLoading(false)

    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Sign out error:', err)
    }
  }, [supabase])

  /**
   * Persists company changes for the signed-in user and updates local context.
   */
  const updateCompany = useCallback(
    async (data: Partial<CompanyRow>) => {
      if (!user) return

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

  const promoteToAdmin = useCallback(
    async (userId: string) => {
      if (userProfile?.role !== 'admin') {
        return { error: 'Only admins can promote users' }
      }

      const { error } = await supabase
        .from('users')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', userId)

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
      isAdmin: userProfile?.role === 'admin',
      promoteToAdmin,
    }),
    [
      company,
      loading,
      profileLoading,
      promoteToAdmin,
      refreshUserProfile,
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
