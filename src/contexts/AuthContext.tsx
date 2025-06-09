'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, AuthError } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchUserProfile = useCallback(
    async (userId: string) => {
      try {        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {          
          if (error.message.includes('invalid input syntax for type bigint')) {
            console.error('DATABASE SCHEMA ERROR:', error);            setUserProfile({
              id: userId,
              email: user?.email || '',
              contact_name: 'Schema Error - Please Fix Database',
              role: 'external',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as UserProfile);
            return;
          }

          if (error.code !== 'PGRST116') {
            console.error('Error fetching user profile:', error)
            return
          }
        }

        if (data) {
          setUserProfile(data)
        } else {
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert([
              {
                id: userId,
                email: user?.email || '',
                role: 'external',
              },
            ])
            .select()
            .single()

          if (createError) {
            console.error('Error creating user profile:', createError)
          } else {
            setUserProfile(newProfile)
          }
        }
      } catch (err) {
        console.error('Error in fetchUserProfile:', err)
      }
    },
    [supabase, user?.email]
  )

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchUserProfile(session.user.id)
      }
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
        } else if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserProfile, supabase.auth])

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        console.error('Sign in error:', error)
      } else {
        console.log('Sign in successful:', data.user?.email)
      }
      return { error }
    } catch (err) {
      console.error('Sign in exception:', err)
      throw err
    }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error during sign out:', error.message)
      throw error
    }
    // `onAuthStateChange` will handle state reset
  }

  const updateProfile = async (profile: Partial<UserProfile>) => {
    if (!user) return

    const { data, error } = await supabase
      .from('users')
      .update({ ...profile, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    setUserProfile(data)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
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
