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
  
  // Add cache to prevent redundant profile fetches
  const profileFetchCache = useRef<Map<string, { profile: UserProfile | null, timestamp: number }>>(new Map())
  
  // Track creation attempts to prevent duplicate creation calls
  const creationAttempts = useRef(new Set<string>())

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
      const fetchStartTime = performance.now()
      const cacheKey = `${userId}-${userEmail}`
      
      // Check cache first (valid for 2 minutes)
      const cached = profileFetchCache.current.get(cacheKey)
      console.log("cached user profile ============== ",cached);
      
      if (cached && Date.now() - cached.timestamp < 120000) {
        console.log('📋 Using cached profile for:', userId)
        if (cached.profile) {
          setUserProfile(cached.profile)
        }
        return
      }
      
      try {        
        console.log('🔄 Fetching user profile for:', userId, userEmail)
        
        // Create a promise that resolves with the first successful query
        const fetchWithTimeout = async () => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
          
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .abortSignal(controller.signal)
              .maybeSingle()
            
            clearTimeout(timeoutId)
            return { data, error }
          } catch (err) {
            clearTimeout(timeoutId)
            throw err
          }
        }

        let { data, error } = await fetchWithTimeout()

        // If that fails, try fetching by email as fallback
        if (error && userEmail) {
          console.log('⚠️ Primary fetch failed, trying by email:', error.message)
          try {
            const emailResult = await fetchWithTimeout()
            if (!emailResult.error && emailResult.data) {
              console.log('✅ Found user by email')
              data = emailResult.data
              error = null
              
              // Handle ID mismatch
              if (data.id !== userId) {
                console.error('❌ ID MISMATCH - using auth ID')
                data = { ...data, id: userId }
              }
            }
          } catch (emailErr) {
            console.warn('⚠️ Email fetch also failed:', emailErr)
          }
        }

        console.log(`⏱️ Profile fetch took ${performance.now() - fetchStartTime}ms`)        
        if (error) {
          console.error('🚨 Database query failed:', error)
          
          // Handle common error types
          if (error.name === 'AbortError') {
            console.warn('⏰ Database query timed out')
            setUserProfile(createFallbackProfile(userId, userEmail || '', 'Database Timeout - Please Check Connection'))
            profileFetchCache.current.set(cacheKey, { profile: null, timestamp: Date.now() })
            return
          }
          
          if (error.message?.includes('JSON object requested, multiple (or no) rows returned') || 
              error.code === 'PGRST116') {
            console.error('🔒 RLS POLICY BLOCKING ACCESS')
            setUserProfile(createFallbackProfile(userId, userEmail || '', 'RLS Policy Error - Check Database Policies'))
            profileFetchCache.current.set(cacheKey, { profile: null, timestamp: Date.now() })
            return
          }
          
          // Check for RLS INSERT policy error during user creation
          if (error.message?.includes('new row violates row-level security policy') ||
              error.code === '42501' ||
              error.message?.includes('permission denied') ||
              error.message?.includes('policy')) {
            console.error('🚫 RLS INSERT POLICY MISSING - User creation blocked')
            console.error('💡 Solution: Run the fix-insert-policy.sql file in your Supabase SQL Editor')
            setUserProfile(createFallbackProfile(userId, userEmail || '', 'Database Policy Error - Missing INSERT permission'))
            profileFetchCache.current.set(cacheKey, { profile: null, timestamp: Date.now() })
            return
          }
          
          // Create fallback for any other error
          console.warn('🛟 Creating emergency fallback profile')
          setUserProfile(createFallbackProfile(userId, userEmail || '', 'Profile Load Error - Please Contact Support'))
          profileFetchCache.current.set(cacheKey, { profile: null, timestamp: Date.now() })
          return
        }

        if (data) {
          console.log('✅ Found existing user profile:', data)
          setUserProfile(data)
          profileFetchCache.current.set(cacheKey, { profile: data, timestamp: Date.now() })
        } else {
          // User doesn't exist, but before creating, let's try one more check by email
          console.log('🔍 No profile found by ID, checking by email before creating...')
          
          if (userEmail) {
            try {
              const { data: emailProfile, error: emailError } = await supabase
                .from('users')
                .select('*')
                .eq('email', userEmail)
                .maybeSingle()
              
              if (!emailError && emailProfile) {
                console.log('✅ Found existing profile by email:', emailProfile)
                // If IDs don't match, we might need to update the ID
                if (emailProfile.id !== userId) {
                  console.log('⚠️ Found profile with different ID, updating to match auth ID...')
                  const { data: updatedProfile, error: updateError } = await supabase
                    .from('users')
                    .update({ id: userId })
                    .eq('email', userEmail)
                    .select()
                    .single()
                  
                  if (!updateError && updatedProfile) {
                    console.log('✅ Successfully updated profile ID:', updatedProfile)
                    setUserProfile(updatedProfile)
                    profileFetchCache.current.set(cacheKey, { profile: updatedProfile, timestamp: Date.now() })
                    return
                  } else {
                    console.warn('⚠️ Failed to update profile ID, using existing profile')
                    setUserProfile(emailProfile)
                    profileFetchCache.current.set(cacheKey, { profile: emailProfile, timestamp: Date.now() })
                    return
                  }
                } else {
                  setUserProfile(emailProfile)
                  profileFetchCache.current.set(cacheKey, { profile: emailProfile, timestamp: Date.now() })
                  return
                }
              }
            } catch (emailCheckError) {
              console.warn('⚠️ Email check failed:', emailCheckError)
            }
          }
          
          // If we get here, no profile exists - create a new one
          console.log('🆕 Creating new user profile for:', userId, userEmail)
          
          // Check if we're already attempting to create this profile
          const creationKey = `${userId}-${userEmail}`
          if (creationAttempts.current.has(creationKey)) {
            console.log('⚠️ Already attempting to create profile, using fallback...')
            setUserProfile(createFallbackProfile(userId, userEmail || '', 'Creation In Progress'))
            return
          }
          
          // Mark this creation attempt
          creationAttempts.current.add(creationKey)
          
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('users')
              .insert([{
                id: userId,
                email: userEmail || '',
                role: 'external',
              }])
              .select()
              .single()

            if (createError) {
              console.error('❌ Error creating user profile:', createError)
                    // If it's a duplicate key error, try to fetch the existing profile
          if (createError.code === '23505' && createError.message.includes('duplicate key')) {
            console.log('🔄 Profile already exists, attempting to fetch existing profile...')
            try {
              // Try fetching by ID first
              let { data: existingProfile, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle()
              
              // If not found by ID, try by email
              if (!existingProfile && userEmail) {
                const { data: emailProfile, error: emailError } = await supabase
                  .from('users')
                  .select('*')
                  .eq('email', userEmail)
                  .maybeSingle()
                
                if (!emailError && emailProfile) {
                  existingProfile = emailProfile
                  fetchError = null
                }
              }
              
              if (!fetchError && existingProfile) {
                console.log('✅ Successfully fetched existing user profile:', existingProfile)
                setUserProfile(existingProfile)
                profileFetchCache.current.set(cacheKey, { profile: existingProfile, timestamp: Date.now() })
              } else {
                console.error('❌ Failed to fetch existing profile:', fetchError)
                setUserProfile(createFallbackProfile(userId, userEmail || '', 'Profile Exists But Fetch Failed'))
                profileFetchCache.current.set(cacheKey, { profile: null, timestamp: Date.now() })
              }
            } catch (fetchErr) {
              console.error('💥 Error fetching existing profile:', fetchErr)
              setUserProfile(createFallbackProfile(userId, userEmail || '', 'Profile Fetch Error'))
              profileFetchCache.current.set(cacheKey, { profile: null, timestamp: Date.now() })
            }
              } else {
                // Other creation errors
                setUserProfile(createFallbackProfile(userId, userEmail || '', 'Profile Creation Failed'))
                profileFetchCache.current.set(cacheKey, { profile: null, timestamp: Date.now() })
              }
              
              // Clear creation attempt flag
              creationAttempts.current.delete(creationKey)
            } else {
              console.log('✅ Successfully created user profile:', newProfile)
              setUserProfile(newProfile)
              profileFetchCache.current.set(cacheKey, { profile: newProfile, timestamp: Date.now() })
              
              // Clear creation attempt flag
              creationAttempts.current.delete(creationKey)
            }
          } catch (err) {
            console.error('💥 Error creating profile:', err)
            setUserProfile(createFallbackProfile(userId, userEmail || '', 'Profile Creation Error'))
            profileFetchCache.current.set(cacheKey, { profile: null, timestamp: Date.now() })
            
            // Clear creation attempt flag
            creationAttempts.current.delete(creationKey)
          }
        }
      } catch (err) {
        console.error('💥 Unexpected error in fetchUserProfile:', err)
        setUserProfile(createFallbackProfile(userId, userEmail || '', 'Unexpected Error'))
        profileFetchCache.current.set(cacheKey, { profile: null, timestamp: Date.now() })
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
              userProfileRef.current?.role
            ))
            setLoading(false)
          }, 6000) // Reduced to 6 seconds

          try {
            await fetchUserProfile(session.user.id, session.user.email)
            clearTimeout(timeoutId)
          } catch (error) {
            clearTimeout(timeoutId)
            console.error('🚨 Initial profile fetch failed:', error)
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
          console.log('👋 Auth state change: SIGNED_OUT')
          setUser(null)
          setUserProfile(null)
          setLoading(false)
          profileFetchCache.current.clear() // Clear cache on signout
        } else if (session?.user) {
          console.log('👤 Auth state change: User signed in -', session.user.email)
          setUser(session.user)
          // Only refetch if we don't have a valid profile for this user
          if (!userProfileRef.current || userProfileRef.current.id !== session.user.id) {
            setLoading(true)
            
            const timeoutId = setTimeout(() => {
              console.warn('⏰ Auth state profile fetch timed out')
              // setUserProfile(createFallbackProfile(
              //   session.user.id, 
              //   session.user.email || '', 
              //   'Profile Load Timeout',
              //   userProfileRef.current?.role
              // ))
              setLoading(false)
            }, 6000)

            try {
              await fetchUserProfile(session.user.id, session.user.email)
              clearTimeout(timeoutId)
              setLoading(false)
            } catch (error) {
              clearTimeout(timeoutId)
              console.error('🚨 Profile fetch failed during auth state change:', error)
              setLoading(false)
            }
          } else {
            console.log('👍 Already have valid profile for user')
            setLoading(false)
          }
        } else {
          console.log('🔄 Auth state change: No session')
          setLoading(false)
        }
      }
    )

    console.log("user profile in getsession ====== ", userProfile)

    return () => subscription.unsubscribe()
  }, [supabase, fetchUserProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔐 Attempting sign in for:', email)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log("error signing ", error);
      
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
  }, [supabase])

  const signUp = useCallback(async (email: string, password: string) => {
    console.log('📝 Attempting sign up for:', email)
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }, [supabase])

  const signOut = useCallback(async () => {
    console.log('👋 Initiating sign out for user:', user?.email)
    
    // Clear local state immediately
    setUser(null)
    setUserProfile(null)
    setLoading(false)
    profileFetchCache.current.clear()
    
    // Attempt Supabase signout with timeout
    try {
      const signOutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 3000)
      )
      
      await Promise.race([signOutPromise, timeoutPromise])
      console.log('✅ Supabase sign out successful')
    } catch (error) {
      console.warn('⚠️ Supabase sign out failed or timed out:', error)
    }
  }, [user?.email, supabase])

  const updateProfile = useCallback(async (profile: Partial<UserProfile>) => {
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
    // Update cache
    const cacheKey = `${user.id}-${user.email}`
    profileFetchCache.current.set(cacheKey, { profile: data, timestamp: Date.now() })
  }, [user, supabase])

  const refreshUserProfile = useCallback(async () => {
    if (!user) return
    
    console.log('🔄 Manually refreshing user profile...')
    // Clear cache for this user
    const cacheKey = `${user.id}-${user.email}`
    profileFetchCache.current.delete(cacheKey)
    await fetchUserProfile(user.id, user.email)
  }, [user, fetchUserProfile])

  const promoteToAdmin = useCallback(async (userId: string) => {
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
  }, [userProfile?.role, supabase])

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
