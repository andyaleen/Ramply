'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Mail, Lock, CheckCircle, ArrowLeft } from 'lucide-react'

interface AuthFormProps {
  defaultTab?: 'signin' | 'signup'
}

export function AuthForm({ defaultTab = 'signin' }: AuthFormProps) {
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as 'signin' | 'signup' | null
  const initialTab = tabFromUrl || defaultTab
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)
  const { signIn } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setAdminKey('')
    setIsAdminMode(false)
    setError('')
    setSuccess(false)
  }
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'signin' | 'signup')
    resetForm()
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }      try {
      const { error } = await signIn(email.trim(), password)
      if (error) {
        // Provide more helpful error messages
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and confirm your account before signing in.')
        } else {
          setError(error.message)
        }
      } else {
        // Wait a moment for the auth context to update with user profile
        setTimeout(async () => {
          // Get the latest auth state after sign in
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            // Fetch user profile to determine role
            const { data: userProfile } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single()
            
            // Redirect based on role
            if (userProfile?.role === 'admin') {
              console.log('Redirecting admin user to /admin')
              router.push('/admin')
            } else {
              console.log('Redirecting regular user to /dashboard')
              router.push('/dashboard')
            }
          } else {
            // Fallback to dashboard if we can't determine role
            // router.push('/dashboard')
          }
        }, 500) // Small delay to ensure auth context is updated
      }
    } catch (err) {
      console.error('Sign in error:', err)
      setError('An unexpected error occurred')    } finally {
      setLoading(false)
    }
  }
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Basic validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }    // Email validation with more comprehensive checks
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    // Additional email validation checks
    if (email.length < 5) {
      setError('Email address is too short')
      setLoading(false)
      return
    }

    const emailParts = email.split('@')
    if (emailParts.length !== 2 || emailParts[0].length < 2 || emailParts[1].length < 3) {
      setError('Please enter a complete email address')
      setLoading(false)
      return
    }

    // Admin-specific validation
    if (isAdminMode) {
      if (!adminKey) {
        setError('Admin registration key is required')
        setLoading(false)
        return
      }

      const validAdminKey = process.env.NEXT_PUBLIC_ADMIN_SIGNUP_KEY || 'admin123'
      if (adminKey !== validAdminKey) {
        setError('Invalid admin key. Please contact your system administrator.')
        setLoading(false)
        return
      }
    }

    console.log(`🔧 ${isAdminMode ? 'Admin' : 'Regular'} signup initiated for:`, email)

    try {
      const redirectUrl = isAdminMode ? '/admin' : '/dashboard'
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectUrl}`
        }
      })      
      if (authError) {
        console.error('❌ Auth signup error:', authError)
        if (authError.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.')
        } else if (authError.message.includes('invalid') && authError.message.includes('email')) {
          setError('The email address format is not accepted. Please try a different email address.')
        } else if (authError.message.includes('Email address')) {
          setError('There was an issue with the email address. Please try a different email or contact support.')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      if (authData.user) {
        console.log('✅ User created successfully:', authData.user.id)
        
        // Create user profile with appropriate role
        const userRole = isAdminMode ? 'admin' : 'external'
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: authData.user.email,
              role: userRole,
            },
          ])

        if (profileError) {
          console.error('❌ Error creating user profile:', profileError)
          setError('Account created but profile setup failed. Please contact support.')
        } else {
          console.log(`✅ ${userRole} profile created successfully`)
        }

        setSuccess(true)
      }
    } catch (err) {
      console.error('💥 Sign up error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
        }
      })
      if (error) {
        setError(error.message)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Success state for signup
  if (success) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4 min-h-[calc(100vh-140px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-600 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>            
            <CardTitle className="text-2xl font-bold">
              {isAdminMode ? 'Admin Account Created!' : 'Check Your Email'}
            </CardTitle>
            <CardDescription>
              We&apos;ve sent you a confirmation link at {email}
              {isAdminMode && '. After confirming, you\'ll be redirected to the admin dashboard.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">            
            <p className="text-sm text-gray-600 text-center">
              {isAdminMode 
                ? 'Your admin account has been created successfully. Please check your email and click the confirmation link to activate your account. You will be redirected to the admin dashboard after confirmation.'
                : 'Please check your email and click the confirmation link to activate your account.'
              }
            </p>
            <div className="flex flex-col space-y-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveTab('signin')
                  resetForm()
                }}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>              <Button
                onClick={() => {
                  setSuccess(false)
                  setEmail('')
                  setPassword('')
                  setConfirmPassword('')
                  setAdminKey('')
                  setIsAdminMode(false)
                }}
                className="w-full"
              >
                Try Different Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 min-h-[calc(100vh-140px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Onbo</CardTitle>
          <CardDescription>
            Streamline your vendor and customer onboarding process
          </CardDescription>
        </CardHeader>        <CardContent>
          {/* Google OAuth Button */}
          <div className="mb-6">
            <Button 
              onClick={handleGoogleSignIn}
              variant="outline" 
              className="w-full h-11"
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-gray-300" />
              <span className="px-3 text-gray-500 text-sm">OR</span>
              <div className="flex-1 border-t border-gray-300" />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>                {error && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600">{error}</p>
                    {error.includes('Invalid email or password') && (
                      <p className="text-sm text-gray-600">
                        Don&apos;t have an account?{' '}
                        <button
                          type="button"
                          onClick={() => setActiveTab('signup')}
                          className="text-blue-600 hover:text-blue-500 font-medium underline"
                        >
                          Sign up here
                        </button>
                      </p>
                    )}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {/* Admin Registration Toggle */}
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <input
                      id="admin-toggle"
                      type="checkbox"
                      checked={isAdminMode}
                      onChange={(e) => setIsAdminMode(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="admin-toggle" className="text-sm font-medium text-blue-900">
                      Register as Administrator
                    </Label>
                  </div>
                  
                  {isAdminMode && (
                    <div className="space-y-2">
                      <Label htmlFor="admin-key" className="text-sm text-blue-900">Admin Registration Key</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-blue-600" />
                        <Input
                          id="admin-key"
                          type="password"
                          placeholder="Enter admin registration key"
                          value={adminKey}
                          onChange={(e) => setAdminKey(e.target.value)}
                          className="pl-10 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                          required={isAdminMode}
                        />
                      </div>
                      <p className="text-xs text-blue-700">
                        Contact your system administrator for the admin registration key
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="space-y-2">
                    <p className={`text-sm ${error.includes('Check your email') ? 'text-green-600' : 'text-red-600'}`}>
                      {error}
                    </p>
                    {error.includes('already exists') && (
                      <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => setActiveTab('signin')}
                          className="text-blue-600 hover:text-blue-500 font-medium underline"
                        >
                          Sign in here
                        </button>
                      </p>
                    )}
                  </div>
                )}                <Button type="submit" className="w-full" disabled={loading}>
                  {loading 
                    ? (isAdminMode ? 'Creating Admin Account...' : 'Creating Account...') 
                    : (isAdminMode ? 'Create Admin Account' : 'Create Account')
                  }
                </Button>
              </form>
            </TabsContent>
          </Tabs>        
          </CardContent>            <CardFooter className="text-center text-sm text-muted-foreground">
          <p className="w-full">
            By continuing, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
