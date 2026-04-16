'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, AuthError } from '@supabase/supabase-js'
import type { UserRow, CompanyRow } from '@/lib/database.types'

interface AuthContextType {
  user: User | null
  userProfile: UserRow | null
  company: CompanyRow | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  updateCompany: (data: Partial<CompanyRow>) => Promise<void>
  refreshUserProfile: () => Promise<void>
  isAdmin: boolean
  promoteToAdmin: (userId: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserRow | null>(null)
  const [company, setCompany] = useState<CompanyRow | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  /**
   * Keeps a single browser client instance for the lifetime of the provider so
   * auth listeners and session bootstrap logic do not restart on every render.
   */
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }

  const supabase = supabaseRef.current

  const userProfileRef = useRef<UserRow | null>(null)
  userProfileRef.current = userProfile

  const fetchUserProfile = useCallback(
    async (userId: string, userEmail?: string) => {
      try {
        // Fetch user row (id/email/role only)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (userError) throw userError

        if (userData) {
          setUserProfile(userData)
        } else {
          // Create user row if it doesn't exist (trigger may not have fired)
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{ id: userId, email: userEmail ?? '', role: 'external' }])
            .select()
            .single()

          if (createError && createError.code !== '23505') throw createError

          if (newUser) setUserProfile(newUser)
        }

        // Fetch or create company row
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('owner_user_id', userId)
          .maybeSingle()

        if (companyError) throw companyError

        if (companyData) {
          setCompany(companyData)
        } else {
          const { data: newCompany, error: createCompanyError } = await supabase
            .from('companies')
            .insert([{ owner_user_id: userId }])
            .select()
            .single()

          if (createCompanyError && createCompanyError.code !== '23505') throw createCompanyError
          if (newCompany) setCompany(newCompany)
        }
      } catch (err) {
        console.error('Error loading user profile:', err)
      }
    },
    [supabase]
  )

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id, session.user.email)
        }
      } catch (err) {
        console.error('Error getting session:', err)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
          setCompany(null)
          setLoading(false)
        } else if (session?.user) {
          setUser(session.user)
          if (!userProfileRef.current || userProfileRef.current.id !== session.user.id) {
            setLoading(true)
            try {
              await fetchUserProfile(session.user.id, session.user.email)
            } finally {
              setLoading(false)
            }
          } else {
            setLoading(false)
          }
        } else {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, fetchUserProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [supabase])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }, [supabase])

  const signOut = useCallback(async () => {
    setUser(null)
    setUserProfile(null)
    setCompany(null)
    setLoading(false)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Sign out error:', err)
    }
  }, [supabase])

  const updateCompany = useCallback(async (data: Partial<CompanyRow>) => {
    if (!user) return

    const { data: updated, error } = await supabase
      .from('companies')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('owner_user_id', user.id)
      .select()
      .single()

    if (error) throw error
    setCompany(updated)
  }, [user, supabase])

  const refreshUserProfile = useCallback(async () => {
    if (!user) return
    await fetchUserProfile(user.id, user.email)
  }, [user, fetchUserProfile])

  const promoteToAdmin = useCallback(async (userId: string) => {
    if (userProfile?.role !== 'admin') {
      return { error: 'Only admins can promote users' }
    }
    const { error } = await supabase
      .from('users')
      .update({ role: 'admin', updated_at: new Date().toISOString() })
      .eq('id', userId)

    return { error: error?.message ?? null }
  }, [userProfile?.role, supabase])

  const contextValue = useMemo(
    () => ({
      user,
      userProfile,
      company,
      loading,
      signIn,
      signUp,
      signOut,
      updateCompany,
      refreshUserProfile,
      isAdmin: userProfile?.role === 'admin',
      promoteToAdmin,
    }),
    [user, userProfile, company, loading, signIn, signUp, signOut, updateCompany, refreshUserProfile, promoteToAdmin]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
