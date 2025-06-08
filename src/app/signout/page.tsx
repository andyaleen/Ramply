'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut, CheckCircle, ArrowLeft } from 'lucide-react'

export default function SignOutPage() {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSignedOut, setIsSignedOut] = useState(false)
  const { signOut, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If user is not logged in, redirect to home
    if (!user) {
      setIsSignedOut(true)
    }
  }, [user])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      setIsSignedOut(true)
      // Redirect after a brief delay to show confirmation
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error) {
      console.error('Error signing out:', error)
      setIsSigningOut(false)
    }
  }
  if (isSignedOut) {
    return (
      <Layout showAuth={false}>
        <div className="flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4 min-h-[calc(100vh-140px)]">
          <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-600 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Signed Out Successfully</CardTitle>
            <CardDescription>
              You have been safely signed out of your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Thank you for using our onboarding platform. You can sign back in anytime.
            </p>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Sign In Again
              </Button>              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </Layout>
    )
  }
  return (
    <Layout showAuth={false}>
      <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 min-h-[calc(100vh-140px)]">
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <LogOut className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Sign Out</CardTitle>
          <CardDescription>
            Are you sure you want to sign out of your account?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">          <p className="text-sm text-gray-600 text-center">
            You&apos;ll need to sign in again to access your dashboard and onboarding data.
          </p>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isSigningOut ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing Out...
                </div>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Yes, Sign Me Out
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={isSigningOut}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel, Stay Signed In
            </Button>
          </div>        </CardContent>
      </Card>
      </div>
    </Layout>
  )
}
