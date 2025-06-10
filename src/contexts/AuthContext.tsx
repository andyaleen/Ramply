'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
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
  refreshUserProfile: () => Promise<void>
  isAdmin: boolean
  promoteToAdmin: (userId: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const fetchUserProfile = useCallback(
    async (userId: string, userEmail?: string) => {
      try {        
        console.log('Fetching user profile for:', userId, userEmail)
        
        // First try to fetch by user ID
        let { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        // If that fails due to 406 or other errors, try fetching by email as fallback
        if (error && userEmail) {
          console.log('Primary fetch failed, trying by email:', error.message)
          const emailResult = await supabase
            .from('users')
            .select('*')
            .eq('email', userEmail)
            .single();
          
          if (!emailResult.error && emailResult.data) {
            console.log('Found user by email, checking for ID mismatch...')
            data = emailResult.data;
            error = null;
              // Check if the user ID from auth matches the database record
            if (data.id !== userId) {
              console.error('ID MISMATCH DETECTED:');
              console.error('Auth User ID:', userId);
              console.error('Database User ID:', data.id);
              console.error('This indicates a database synchronization issue that needs manual fixing.');
              console.error('Please run the emergency-user-sync-fix.sql script in your database.');
              console.error('Do NOT attempt automatic ID updates as this can break foreign key relationships.');
              
              // Instead of trying to update, use the auth user ID for the profile
              // This allows the app to continue functioning while the DB issue is resolved
              data = { ...data, id: userId };
            }
          }
        }        if (error) {
          // Handle RLS policy issues (406 Not Acceptable errors)
          if (error.message?.includes('JSON object requested, multiple (or no) rows returned') || 
              error.code === 'PGRST116') {
            console.error('RLS POLICY BLOCKING ACCESS - This is likely due to missing or incorrect RLS policies');
            console.error('Run emergency-disable-rls.sql followed by fix-user-insert-policy.sql');
            console.error('Error details:', error);
            
            // Set a temporary profile to prevent infinite loops
            setUserProfile({
              id: userId,
              email: userEmail || '',
              contact_name: 'RLS Policy Error - Check Database Policies',
              role: 'external',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as UserProfile);
            return;
          }
          
          if (error.message.includes('invalid input syntax for type bigint')) {
            console.error('DATABASE SCHEMA ERROR:', error);            
            setUserProfile({
              id: userId,
              email: userEmail || '',
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
          console.log('Found existing user profile:', data)
          console.log('🔍 User role analysis:', {
            userId: data.id,
            email: data.email,
            role: data.role,
            isAdmin: data.role === 'admin',
            shouldBeAdmin: data.role === 'admin'
          })
          setUserProfile(data)
        } else {
          // User doesn't exist, create a new profile
          console.log('Creating new user profile for:', userId, userEmail)
          
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert([
              {
                id: userId,
                email: userEmail || '',
                role: 'external',
              },
            ])
            .select()
            .single()

          if (createError) {
            console.error('Error creating user profile:', {
              message: createError.message,
              details: createError.details,
              hint: createError.hint,
              code: createError.code,
              userId: userId,
              userEmail: userEmail,
              fullError: createError
            })
            
            // Handle duplicate email constraint error
            if (createError.code === '23505' && createError.message?.includes('users_email_key')) {
              console.log('User with this email already exists, trying to fetch by email...')
              // Try to fetch the existing user by email
              const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('email', userEmail || '')
                .single();
              
              if (!fetchError && existingUser) {
                console.log('Found existing user by email:', existingUser)
                setUserProfile(existingUser)
                return;
              } else {
                console.error('Could not fetch existing user by email:', fetchError)
              }
            }
            
            // Check for RLS policy issues
            if (createError.message?.includes('new row violates row-level security policy') || 
                createError.code === '42501') {
              console.error('RLS POLICY ERROR: User cannot insert their own profile. Missing INSERT policy on users table.')
              console.error('Run the fix-user-insert-policy.sql script to resolve this issue.')
            }
          } else {
            console.log('Successfully created user profile:', newProfile)
            setUserProfile(newProfile)
          }
        }
      } catch (err) {
        console.error('Error in fetchUserProfile:', err)
      }
    },
    [supabase]
  )
  useEffect(() => {    const getSession = async () => {
      const start = performance.now()
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          // Keep loading true while fetching profile
          await fetchUserProfile(session.user.id, session.user.email)
        }
      } catch (err) {
        console.error('Error getting session:', err)
      }
      setLoading(false)
      console.log('Session + profile fetch took', performance.now() - start, 'ms')
    }

    getSession()    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          console.log('Auth state change: SIGNED_OUT - User successfully signed out')
          setUser(null)
          setUserProfile(null)
          setLoading(false)
        } else if (session?.user) {
          console.log('Auth state change:', event, session.user.email)
          setUser(session.user)
          // Keep loading true while fetching profile
          setLoading(true)
          await fetchUserProfile(session.user.id, session.user.email)
          setLoading(false)
        } else {
          console.log('Auth state change:', event, 'no session')
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserProfile])


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
    console.log('Initiating sign out for user:', user?.email)
    
    // Clear local state immediately to ensure UI updates
    console.log('Clearing local state immediately...')
    setUser(null)
    setUserProfile(null)
    setLoading(false)
    console.log('Local state cleared')
    
    // Attempt Supabase signout in background
    try {
      console.log('Attempting Supabase auth signOut...')
      const signOutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout after 5 seconds')), 5000)
      )
      
      const { error } = await Promise.race([signOutPromise, timeoutPromise]) as { error?: Error }
      
      if (error) {
        console.error('Supabase sign out error:', error.message)
      } else {
        console.log('Supabase sign out successful')
      }    } catch (error: unknown) {
      console.warn('Supabase sign out failed or timed out (this is OK, local state already cleared):', error instanceof Error ? error.message : 'Unknown error')
    }
    
    console.log('Sign out process complete')
  }
  const updateProfile = async (profile: Partial<UserProfile>) => {
    if (!user) return

    // First try to update by auth user ID
    let { data, error } = await supabase
      .from('users')
      .update({ ...profile, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    // If that fails due to ID mismatch, try updating by email
    if (error && user.email) {
      console.log('Update by ID failed, trying by email:', error.message)
      const emailUpdate = await supabase
        .from('users')
        .update({ ...profile, updated_at: new Date().toISOString() })
        .eq('email', user.email)
        .select()
        .single()
      
      if (!emailUpdate.error && emailUpdate.data) {
        data = emailUpdate.data
        error = null
      }
    }    if (error) {
      throw error
    }

    setUserProfile(data)
  }

  const refreshUserProfile = async () => {
    if (!user) return
    
    console.log('🔄 Manually refreshing user profile...')
    await fetchUserProfile(user.id, user.email)
  }

  const promoteToAdmin = async (userId: string) => {
    if (!userProfile?.role || userProfile.role !== 'admin') {
      return { error: 'Only admins can promote users' }
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) {
        console.error('Error promoting user to admin:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Error in promoteToAdmin:', err)
      return { error: 'An unexpected error occurred' }
    }
  }
  const contextValue = useMemo(
    () => ({
      user,
      userProfile,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      refreshUserProfile,
      isAdmin: userProfile?.role === 'admin',
      promoteToAdmin,
    }),
    [user, userProfile, loading, signIn, signUp, signOut, updateProfile, refreshUserProfile, promoteToAdmin]
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
