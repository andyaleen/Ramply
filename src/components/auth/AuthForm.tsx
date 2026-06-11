'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Lock, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthScreen } from '@/components/auth/AuthScreen'
import {
  buildPasswordRecoveryRedirectUrl,
  buildSupabaseAuthRedirectUrl,
} from '@/lib/auth/auth-redirect'
import {
  clearPasswordRecoveryPending,
  markPasswordRecoveryPending,
} from '@/lib/auth/password-recovery-pending'
import { normalizeRequestedPath } from '@/lib/auth/routing'
import { extractShareRequestToken } from '@/lib/auth/share-recipient-signup'
import { AUTH_PASSWORD_MIN_LENGTH, getSessionExpiryMessage } from '@/lib/auth/session-policy'
import { applyClientAuthSession } from '@/lib/auth/apply-client-auth-session'
import type { BootstrapAppUserResult } from '@/lib/auth/bootstrap-app-user'
import type { CompletePasswordSignInSession } from '@/lib/auth/complete-password-sign-in'
import { startGoogleAuth } from '@/lib/auth/startGoogleAuth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
interface AuthFormProps {
  defaultTab?: 'signin' | 'signup'
  /** When set, overrides the `redirect` search param for post-auth navigation. */
  redirectPath?: string
  /** Renders only the card (no full-page AuthScreen shell). */
  embedded?: boolean
  /** Pre-fills the email field — used on share-request links. */
  suggestedEmail?: string
  /** Share-request onboard token; validated server-side during sign-in. */
  shareRequestToken?: string
  /** Overrides the auth card headline for embedded flows. */
  welcomeTitle?: string
}

function authCallbackUrl(nextPath: string): string {
  return buildSupabaseAuthRedirectUrl(nextPath)
}

function AuthFormShell({
  embedded,
  children,
}: {
  embedded?: boolean
  children: React.ReactNode
}) {
  if (embedded) return <>{children}</>
  return <AuthScreen>{children}</AuthScreen>
}

/**
 * Unified Ramply authentication surface for sign-in, sign-up, and magic-link fallback.
 */
export function AuthForm({
  defaultTab = 'signin',
  redirectPath,
  embedded = false,
  suggestedEmail,
  shareRequestToken,
  welcomeTitle = 'Welcome back to Ramply',
}: AuthFormProps) {
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as 'signin' | 'signup' | null
  const initialTab = tabFromUrl || defaultTab
  const requestedPath = normalizeRequestedPath(
    redirectPath ?? searchParams.get('redirect'),
    redirectPath ?? '/dashboard'
  )
  const sessionMessage = getSessionExpiryMessage(searchParams.get('reason'))
  const inviteToken = shareRequestToken ?? extractShareRequestToken(requestedPath)

  const [email, setEmail] = useState(suggestedEmail ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [signupUserId, setSignupUserId] = useState<string | null>(null)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)
  const router = useRouter()
  const { seedBootstrapState } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (suggestedEmail) {
      setEmail(suggestedEmail)
    }
  }, [suggestedEmail])

  const resetForm = () => {
    setEmail(suggestedEmail ?? '')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
    setMagicLinkSent(false)
    setSignupUserId(null)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'signin' | 'signup')
    resetForm()
  }

  /**
   * Formats common Supabase network errors into user-friendly messages.
   */
  const formatAuthError = (message: string | undefined): string => {
    if (!message) return 'An unexpected error occurred'
    if (message === 'Failed to fetch' || message.includes('fetch') || message.includes('network')) {
      return 'Unable to connect. Please check your internet connection and try again.'
    }
    if (message.includes('Invalid login credentials')) {
      return 'Incorrect password for this email. Use Forgot password below, or try magic link.'
    }
    if (message.includes('Email not confirmed')) {
      return 'We could not sign you in yet. Try again or contact support if this continues.'
    }
    if (message.includes('User already registered')) {
      return 'An account with this email already exists. Please sign in instead.'
    }
    if (message.includes('invalid') && message.includes('email')) {
      return 'The email address format is not accepted. Please try a different email address.'
    }
    return message
  }

  /**
   * Server-side password sign-in that sets session cookies and skips email confirmation.
   */
  const completePasswordSignIn = async (): Promise<boolean> => {
    if (!email.trim() || !password) return false

    clearPasswordRecoveryPending()

    const res = await fetch('/api/auth/complete-sign-in', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        ...(inviteToken ? { shareToken: inviteToken } : {}),
        ...(signupUserId ? { userId: signupUserId } : {}),
      }),
    })

    const payload = (await res.json().catch(() => ({}))) as {
      error?: string
      code?: 'incorrect_password' | 'oauth_only' | 'user_not_found'
      session?: CompletePasswordSignInSession | null
      bootstrap?: BootstrapAppUserResult | null
    }
    if (!res.ok) {
      if (payload.code === 'incorrect_password') {
        setError(
          'Incorrect password for this email. If you signed up multiple times, use the password from your first sign-up, or reset it below.'
        )
      } else if (payload.code === 'oauth_only') {
        setError('This email uses Google sign-in. Use Continue with Google instead.')
      } else if (payload.code === 'user_not_found') {
        setError('No account found for this email. Create an account on the Sign Up tab.')
      } else {
        setError(formatAuthError(payload.error))
      }
      return false
    }

    try {
      if (payload.bootstrap) {
        seedBootstrapState(payload.bootstrap)
      }
      await applyClientAuthSession(supabase, payload.session)
    } catch (sessionError) {
      console.error('Failed to establish client session after sign-in:', sessionError)
      setError('Signed in, but the session could not be saved. Please try again.')
      return false
    }

    router.replace(requestedPath)
    router.refresh()
    return true
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email || !password) {
      setError('Please enter both email and password')
      setLoading(false)
      return
    }

    try {
      await completePasswordSignIn()
    } catch (err) {
      console.error('Sign in error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleContinueAfterSignup = async () => {
    if (!password) {
      setError('Enter the password you just created to continue.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const signedIn = await completePasswordSignIn()
      if (!signedIn) {
        setError((current) =>
          current || 'We could not sign you in yet. Check your password and try again.'
        )
      }
    } catch (err) {
      console.error('Continue after signup error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${AUTH_PASSWORD_MIN_LENGTH} characters long`)
      setLoading(false)
      return
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: authCallbackUrl(requestedPath),
        },
      })

      if (authError) {
        setError(formatAuthError(authError.message))
        setLoading(false)
        return
      }

      if (authData.session) {
        router.replace(requestedPath)
        return
      }

      if (authData.user) {
        const identities = authData.user.identities ?? []
        if (identities.length === 0) {
          setError(
            'An account with this email already exists. Sign in with your original password, or use Forgot password on the Sign In tab.'
          )
          setActiveTab('signin')
          setLoading(false)
          return
        }

        setSignupUserId(authData.user.id)
        if (await completePasswordSignIn()) {
          return
        }
        setSuccess(true)
      }
    } catch (err) {
      console.error('Sign up error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sends a Supabase password reset email for accounts that already exist.
   */
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address first, then choose Forgot password.')
      return
    }

    setForgotLoading(true)
    setError('')

    try {
      const apiResponse = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (apiResponse.ok) {
        toast.success(`Password reset link sent to ${email.trim()}`)
        return
      }

      const payload = (await apiResponse.json().catch(() => null)) as {
        code?: string
        error?: string
      } | null

      if (apiResponse.status !== 503 || payload?.code !== 'USE_CLIENT_FALLBACK') {
        setError(payload?.error || 'Failed to send password reset email. Please try again.')
        return
      }

      markPasswordRecoveryPending()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildPasswordRecoveryRedirectUrl(),
      })

      if (resetError) {
        setError(formatAuthError(resetError.message))
        return
      }

      toast.success(`Password reset link sent to ${email.trim()}`)
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('Failed to send password reset email. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  /**
   * Sends a passwordless magic link to the user's email via Supabase OTP.
   */
  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: authCallbackUrl(requestedPath),
        },
      })

      if (magicLinkError) {
        setError(formatAuthError(magicLinkError.message))
      } else {
        setMagicLinkSent(true)
      }
    } catch (err) {
      console.error('Magic link error:', err)
      setError('Failed to send magic link. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      const authError = await startGoogleAuth(requestedPath)
      if (authError) {
        setError(formatAuthError(authError))
      }
    } finally {
      setLoading(false)
    }
  }

  if (magicLinkSent) {
    return (
      <AuthFormShell embedded={embedded}>
        <StatusCard
          icon={<Mail className="h-6 w-6 text-white" />}
          title="Check your email"
          description={`We sent a sign-in link to ${email}. For security, use it as soon as possible.`}
          primaryLabel={resendLoading ? 'Sending…' : 'Resend sign-in link'}
          onPrimaryClick={() => void handleMagicLink()}
          primaryDisabled={resendLoading}
          secondaryLabel="Back to Sign In"
          onSecondaryClick={() => {
            setMagicLinkSent(false)
            setError('')
          }}
        />
      </AuthFormShell>
    )
  }

  if (success) {
    return (
      <AuthFormShell embedded={embedded}>
        <StatusCard
          icon={<CheckCircle className="h-6 w-6 text-white" />}
          title="Account created"
          description={`Your account is ready. You do not need a confirmation email to continue — use the same password you just created to go to your dashboard.`}
          error={error}
          primaryLabel={loading ? 'Signing you in…' : 'Continue to dashboard'}
          onPrimaryClick={() => void handleContinueAfterSignup()}
          primaryDisabled={loading}
          secondaryLabel="Back to Sign In"
          onSecondaryClick={() => {
            setActiveTab('signin')
            setSuccess(false)
            setError('')
          }}
          tertiaryLabel="Try different email"
          onTertiaryClick={() => {
            setSuccess(false)
            setEmail(suggestedEmail ?? '')
            setPassword('')
            setConfirmPassword('')
            setSignupUserId(null)
            setError('')
          }}
        />
      </AuthFormShell>
    )
  }

  return (
    <AuthFormShell embedded={embedded}>
      <Card className={`w-full border-[#DDDCD5] bg-white shadow-[0_28px_80px_rgba(15,31,24,0.08)] ${embedded ? 'rounded-2xl' : 'rounded-[28px]'}`}>
        <CardHeader className="space-y-2 border-b border-[#EEECE5] px-8 pb-6 pt-8 text-center">
          <CardTitle className="text-3xl font-semibold tracking-tight text-[#0F1F18]">
            {welcomeTitle}
          </CardTitle>
          <CardDescription className="mx-auto max-w-md text-[15px] leading-relaxed text-[#5D6D66]">
            Sign in to share company information, manage onboarding requests, and keep your verified profile moving.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 py-8">
          {sessionMessage && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {sessionMessage}
            </div>
          )}
          <div className="mb-6">
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="h-11 w-full border-[#DDDCD5] text-[#0F1F18] hover:border-[#287253] hover:bg-[#F7F8F4]"
              disabled={loading}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="my-4 flex items-center">
              <div className="flex-1 border-t border-[#DDDCD5]" />
              <span className="px-3 text-sm text-[#7A8C84]">OR</span>
              <div className="flex-1 border-t border-[#DDDCD5]" />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#F6F4EE]">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Field
                  id="signin-email"
                  label="Email"
                  type="email"
                  autoComplete="username"
                  placeholder="Enter your email"
                  value={email}
                  onChange={setEmail}
                  icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                />
                <Field
                  id="signin-password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={setPassword}
                  icon={<Lock className="h-4 w-4 text-muted-foreground" />}
                />

                <ErrorBlock
                  error={error}
                  actionLabel="Sign up here"
                  showAction={error.includes('Invalid email or password')}
                  onAction={() => setActiveTab('signup')}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#0F1F18] text-white hover:bg-[#1D3329]"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>

                <div className="space-y-2 text-center">
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    disabled={loading || forgotLoading}
                    className="text-sm text-[#287253] hover:text-[#1A4D38] hover:underline disabled:opacity-50"
                  >
                    {forgotLoading ? 'Sending reset link…' : 'Forgot password?'}
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={handleMagicLink}
                      disabled={loading}
                      className="text-sm text-[#287253] hover:text-[#1A4D38] hover:underline disabled:opacity-50"
                    >
                      Send magic link instead
                    </button>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Field
                  id="signup-email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={setEmail}
                  icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                />
                <Field
                  id="signup-password"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={password}
                  onChange={setPassword}
                  minLength={AUTH_PASSWORD_MIN_LENGTH}
                  helperText={`Use at least ${AUTH_PASSWORD_MIN_LENGTH} characters.`}
                  icon={<Lock className="h-4 w-4 text-muted-foreground" />}
                />
                <Field
                  id="signup-confirm-password"
                  label="Confirm Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  minLength={AUTH_PASSWORD_MIN_LENGTH}
                  icon={<Lock className="h-4 w-4 text-muted-foreground" />}
                />

                <ErrorBlock
                  error={error}
                  actionLabel="Sign in here"
                  showAction={error.includes('already exists')}
                  onAction={() => setActiveTab('signin')}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#287253] text-white hover:bg-[#1A4D38]"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="px-8 pb-8 text-center text-sm text-muted-foreground">
          <p className="w-full">
            By continuing, you agree to our{' '}
            <a href="#" className="text-[#287253] hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-[#287253] hover:underline">Privacy Policy</a>
          </p>
        </CardFooter>
      </Card>
    </AuthFormShell>
  )
}

interface FieldProps {
  id: string
  label: string
  type: string
  autoComplete: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  icon: React.ReactNode
  helperText?: string
  minLength?: number
}

function Field({
  id,
  label,
  type,
  autoComplete,
  placeholder,
  value,
  onChange,
  icon,
  helperText,
  minLength,
}: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-3">{icon}</div>
        <Input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
          required
          minLength={minLength}
        />
      </div>
      {helperText ? (
        <p className="text-xs text-[#7A8C84]">{helperText}</p>
      ) : null}
    </div>
  )
}

interface ErrorBlockProps {
  error: string
  showAction: boolean
  actionLabel: string
  onAction: () => void
}

function ErrorBlock({ error, showAction, actionLabel, onAction }: ErrorBlockProps) {
  if (!error) return null

  return (
    <div className="space-y-2">
      <p className="text-sm text-red-600">{error}</p>
      {showAction ? (
        <p className="text-sm text-[#5D6D66]">
          <button
            type="button"
            onClick={onAction}
            className="font-medium text-[#287253] underline hover:text-[#1A4D38]"
          >
            {actionLabel}
          </button>
        </p>
      ) : null}
    </div>
  )
}

interface StatusCardProps {
  icon: React.ReactNode
  title: string
  description: string
  error?: string
  primaryLabel: string
  onPrimaryClick: () => void
  primaryDisabled?: boolean
  secondaryLabel?: string
  onSecondaryClick?: () => void
  tertiaryLabel?: string
  onTertiaryClick?: () => void
}

function StatusCard({
  icon,
  title,
  description,
  error,
  primaryLabel,
  onPrimaryClick,
  primaryDisabled = false,
  secondaryLabel,
  onSecondaryClick,
  tertiaryLabel,
  onTertiaryClick,
}: StatusCardProps) {
  return (
    <Card className="w-full max-w-xl rounded-[28px] border-[#DDDCD5] bg-white shadow-[0_28px_80px_rgba(15,31,24,0.08)]">
      <CardHeader className="space-y-2 px-8 pb-4 pt-8 text-center">
        <div className="mb-3 flex items-center justify-center">
          <div className="rounded-full bg-[#287253] p-3">
            {icon}
          </div>
        </div>
        <CardTitle className="text-3xl font-semibold tracking-tight text-[#0F1F18]">
          {title}
        </CardTitle>
        <CardDescription className="text-[15px] leading-relaxed text-[#5D6D66]">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-8 pb-8">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          onClick={onPrimaryClick}
          disabled={primaryDisabled}
          className="w-full bg-[#287253] text-white hover:bg-[#1A4D38]"
        >
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondaryClick ? (
          <Button onClick={onSecondaryClick} variant="outline" className="w-full border-[#DDDCD5]">
            {secondaryLabel}
          </Button>
        ) : null}
        {tertiaryLabel && onTertiaryClick ? (
          <Button onClick={onTertiaryClick} variant="ghost" className="w-full">
            {tertiaryLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
