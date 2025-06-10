'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown, ArrowRight, RefreshCw } from 'lucide-react'

export default function AdminRedirectPage() {
  const { user, userProfile, isAdmin, loading, refreshUserProfile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If user is confirmed admin, redirect immediately
    if (!loading && isAdmin && userProfile?.role === 'admin') {
      console.log('✅ Admin confirmed, redirecting to admin dashboard')
      router.push('/admin')
    }
  }, [loading, isAdmin, userProfile?.role, router])

  const handleRefreshAndRedirect = async () => {
    await refreshUserProfile()
    setTimeout(() => {
      if (userProfile?.role === 'admin') {
        window.location.href = '/admin'
      }
    }, 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Crown className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>Admin Access</CardTitle>
          <CardDescription>
            Redirecting to admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {userProfile?.role}</p>
            <p><strong>Admin Status:</strong> {isAdmin ? '✅ Admin' : '❌ Not Admin'}</p>
          </div>

          {isAdmin ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                ✅ You have admin privileges! Redirecting to admin dashboard...
              </div>
              
              <Button
                onClick={() => window.location.href = '/admin'}
                className="w-full"
              >
                <Crown className="h-4 w-4 mr-2" />
                Go to Admin Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                ⚠️ Role mismatch detected. Try refreshing your profile.
              </div>
              
              <Button
                onClick={handleRefreshAndRedirect}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Profile & Redirect
              </Button>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Go to User Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
