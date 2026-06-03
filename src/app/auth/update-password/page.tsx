'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { AUTH_PASSWORD_MIN_LENGTH } from '@/lib/auth/session-policy'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Lets a user set a new password after following a Supabase recovery link.
 */
export default function UpdatePasswordPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=/auth/update-password')
    }
  }, [loading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${AUTH_PASSWORD_MIN_LENGTH} characters long`)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      router.replace('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Update password error:', err)
      setError('Failed to update password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0EFE9] p-4">
        <p className="text-[#5D6D66]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md rounded-2xl border-[#DDDCD5] bg-white shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-[#0F1F18]">Set a new password</CardTitle>
          <CardDescription className="text-[#5D6D66]">
            Choose a new password for {user.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={AUTH_PASSWORD_MIN_LENGTH}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  className="pl-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={AUTH_PASSWORD_MIN_LENGTH}
                  required
                />
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button
              type="submit"
              className="w-full bg-[#287253] text-white hover:bg-[#1A4D38]"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save password and continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
