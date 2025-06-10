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
  
  // Use ref to track current userProfile without causing effect re-runs
  const userProfileRef = useRef<UserProfile | null>(null)
  userProfileRef.current = userProfile

  // Create emergency fallback profile
  const createFallbackProfile = (userId: string, userEmail: string, reason: string, preserveRole?: string): UserProfile => ({
    id: userId,
    email: userEmail,
    contact_name: reason,
    role: (preserveRole as 'admin' | 'external') || 'external' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    company_name: null,
    contact_email: null,
    tax_id: null,
    business_type: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
  })

  const fetchUserProfile = useCallback(
    async (userId: string, userEmail?: string) => {
      try {        
        console.log('🔄 Fetching user profile for:', userId, userEmail)
        
        // First try to fetch by user ID
        console.log('📡 Attempting to fetch user by ID...')
        let { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        // If that fails due to 406 or other errors, try fetching by email as fallback
        if (error && userEmail) {
          console.log('⚠️ Primary fetch failed, trying by email:', error.message)
          const emailResult = await supabase
            .from('users')
            .select('*')
            .eq('email', userEmail)
            .single()
          
          if (!emailResult.error && emailResult.data) {
            console.log('✅ Found user by email, checking for ID mismatch...')
            data = emailResult.data
            error = null
            
            // Check if the user ID from auth matches the database record
            if (data.id !== userId) {
              console.error('❌ ID MISMATCH DETECTED:')
              console.error('Auth User ID:', userId)
              console.error('Database User ID:', data.id)
              console.error('This indicates a database synchronization issue that needs manual fixing.')
              console.error('Please run the emergency-user-sync-fix.sql script in your database.')
              console.error('Do NOT attempt automatic ID updates as this can break foreign key relationships.')
              
              // Instead of trying to update, use the auth user ID for the profile
              // This allows the app to continue functioning while the DB issue is resolved
              data = { ...data, id: userId }
            }
          }
        }

        if (error) {
          console.error('🚨 Database query failed:', error)
          
          // Handle RLS policy issues (406 Not Acceptable errors)
          if (error.message?.includes('JSON object requested, multiple (or no) rows returned') || 
              error.code === 'PGRST116') {
            console.error('🔒 RLS POLICY BLOCKING ACCESS - This is likely due to missing or incorrect RLS policies')
            console.error('Run emergency-disable-rls.sql followed by fix-user-insert-policy.sql')
            console.error('Error details:', error)
            
            setUserProfile(createFallbackProfile(userId, userEmail || '', 'RLS Policy Error - Check Database Policies'))
            return
          }
          
          if (error.message?.includes('invalid input syntax for type bigint')) {
            console.error('🗃️ DATABASE SCHEMA ERROR:', error)
            setUserProfile(createFallbackProfile(userId, userEmail || '', 'Schema Error - Please Fix Database'))
            return
          }

          // For production, if we can't fetch the user but they're authenticated,
          // create a minimal profile to prevent app hanging
          if (error.code !== 'PGRST116') {
            console.error('🔥 Unhandled error fetching user profile:', error)
            console.warn('🛟 Creating emergency fallback profile to prevent app crash')
            setUserProfile(createFallbackProfile(userId, userEmail || '', 'Profile Load Error - Please Contact Support'))
            return
          }
        }

        if (data) {
          console.log('✅ Found existing user profile:', data)
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
          console.log('🆕 Creating new user profile for:', userId, userEmail)
          
          try {
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
              console.error('❌ Error creating user profile:', {
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
                console.log('📧 User with this email already exists, trying to fetch by email...')
                try {
                  const { data: existingUser, error: fetchError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', userEmail || '')
                    .single()
                  
                  if (!fetchError && existingUser) {
                    console.log('✅ Found existing user by email:', existingUser)
                    setUserProfile(existingUser)
                    return
                  } else {
                    console.error('❌ Could not fetch existing user by email:', fetchError)
                  }
                } catch (err) {
                  console.error('💥 Error fetching existing user:', err)
                }
              }
              
              // Check for RLS policy issues
              if (createError.message?.includes('new row violates row-level security policy') || 
                  createError.code === '42501') {
                console.error('🔒 RLS POLICY ERROR: User cannot insert their own profile. Missing INSERT policy on users table.')
                console.error('Run the fix-user-insert-policy.sql script to resolve this issue.')
              }

              // Create fallback profile if user creation fails
              console.warn('🛟 Creating emergency fallback profile after failed user creation')
              setUserProfile(createFallbackProfile(userId, userEmail || '', 'Profile Creation Failed - Please Contact Support'))
            } else {
              console.log('✅ Successfully created user profile:', newProfile)
              setUserProfile(newProfile)
            }
          } catch (err) {
            console.error('💥 Error creating profile:', err)
            setUserProfile(createFallbackProfile(userId, userEmail || '', 'Profile Creation Error - Please Try Again'))
          }
        }
      } catch (err) {
        console.error('💥 Unexpected error in fetchUserProfile:', err)
        setUserProfile(createFallbackProfile(userId, userEmail || '', 'Unexpected Error - Please Contact Support'))
      }
    },
    [supabase]
  )

  useEffect(() => {
    const getSession = async () => {
      const start = performance.now()
      try {
        console.log('🚀 Getting initial session...')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          console.log('👤 Session found for user:', session.user.email)
          setUser(session.user)
          
          // Add timeout for profile fetch to prevent infinite loading
          const timeoutId = setTimeout(() => {
            console.warn('⏰ Profile fetch timed out, creating fallback profile')
            setUserProfile(createFallbackProfile(
              session.user.id,
              session.user.email || '',
              'Profile Load Timeout - Please Refresh',
              userProfileRef.current?.role // Preserve existing role if available
            ))
            setLoading(false)
          }, 15000)

          try {
            await fetchUserProfile(session.user.id, session.user.email)
            clearTimeout(timeoutId)
          } catch (error) {
            clearTimeout(timeoutId)
            console.error('🚨 Initial profile fetch failed:', error)
            setUserProfile(createFallbackProfile(
              session.user.id,
              session.user.email || '',
              'Profile Load Error - Please Refresh',
              userProfileRef.current?.role // Preserve existing role if available
            ))
          }
        } else {
          console.log('👤 No session found')
        }
      } catch (err) {
        console.error('💥 Error getting session:', err)
      } finally {
        setLoading(false)
        console.log(`⏱️ Session + profile fetch took ${performance.now() - start}ms`)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email || 'no user')
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 Auth state change: SIGNED_OUT - User successfully signed out')
          setUser(null)
          setUserProfile(null)
          setLoading(false)
        } else if (session?.user) {
          console.log('👤 Auth state change: User signed in -', session.user.email)
          setUser(session.user)
          
          // If we already have a valid user profile, don't refetch unless it's missing essential data
          if (userProfileRef.current && userProfileRef.current.id === session.user.id && userProfileRef.current.role) {
            console.log('👍 Already have valid profile for user, skipping refetch')
            setLoading(false)
            return
          }
          
          setLoading(true)
          
          // Add timeout for profile fetch to prevent infinite loading
          const timeoutId = setTimeout(() => {
            console.warn('⏰ Auth state profile fetch timed out, creating fallback profile')
            setUserProfile(createFallbackProfile(
              session.user.id, 
              session.user.email || '', 
              'Profile Load Timeout - Please Refresh',
              userProfileRef.current?.role // Preserve existing role if available
            ))
            setLoading(false)
          }, 15000)

          try {
            await fetchUserProfile(session.user.id, session.user.email)
            clearTimeout(timeoutId)
            setLoading(false)
          } catch (error) {
            clearTimeout(timeoutId)
            console.error('🚨 Profile fetch failed during auth state change:', error)
            setUserProfile(createFallbackProfile(
              session.user.id, 
              session.user.email || '', 
              'Profile Load Error - Please Refresh',
              userProfileRef.current?.role // Preserve existing role if available
            ))
            setLoading(false)
          }
        } else {
          console.log('🔄 Auth state change: No session')
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase]) // Remove fetchUserProfile dependency to prevent infinite loop

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting sign in for:', email)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        console.error('❌ Sign in error:', error)
      } else {
        console.log('✅ Sign in successful:', data.user?.email)
      }
      return { error }
    } catch (err) {      
      console.error('💥 Sign in exception:', err)
      throw err
    }
  }

  const signUp = async (email: string, password: string) => {
    console.log('📝 Attempting sign up for:', email)
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = async () => {
    console.log('👋 Initiating sign out for user:', user?.email)
    
    // Clear local state immediately to ensure UI updates
    console.log('🧹 Clearing local state immediately...')
    setUser(null)
    setUserProfile(null)
    setLoading(false)
    console.log('✅ Local state cleared')
    
    // Attempt Supabase signout in background with timeout
    try {
      console.log('🔐 Attempting Supabase auth signOut...')
      
      const signOutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout after 5 seconds')), 5000)
      )
      
      await Promise.race([signOutPromise, timeoutPromise])
      console.log('✅ Supabase sign out successful')
    } catch (error: unknown) {
      console.warn('⚠️ Supabase sign out failed or timed out (this is OK, local state already cleared):', error instanceof Error ? error.message : 'Unknown error')
    }
    
    console.log('✅ Sign out process complete')
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
      console.log('⚠️ Update by ID failed, trying by email:', error.message)
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
    }

    if (error) {
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
        console.error('❌ Error promoting user to admin:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('💥 Error in promoteToAdmin:', err)
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
