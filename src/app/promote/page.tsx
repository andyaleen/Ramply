'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Layout } from '@/components/layout'
import { Crown, User, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function PromotePage() {
  const { user, userProfile, isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const promoteCurrentUser = async () => {
    if (!user) {
      toast.error('No user logged in')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) {
        console.error('Error promoting user:', error)
        toast.error('Failed to promote user to admin')
      } else {
        toast.success('Successfully promoted to admin! Please refresh the page.')
        // Refresh the page to update the auth context
        window.location.reload()
      }
    } catch (err) {
      console.error('Error in promotion:', err)
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Layout showAuth={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Not Logged In</CardTitle>
              <CardDescription>Please log in first</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.href = '/login'}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout showAuth={false}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                {isAdmin ? <Crown className="h-6 w-6 text-white" /> : <User className="h-6 w-6 text-white" />}
              </div>
            </div>
            <CardTitle>User Role Management</CardTitle>
            <CardDescription>
              Manage your account role and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Current Role:</strong> {userProfile?.role || 'Loading...'}</p>
              <p><strong>Is Admin:</strong> {isAdmin ? '✅ Yes' : '❌ No'}</p>
            </div>

            {!isAdmin && (
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Admin Access Required</p>
                    <p className="text-amber-700">
                      You need admin privileges to access the admin dashboard. 
                      Click below to promote yourself to admin (development only).
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={promoteCurrentUser}
                  disabled={loading}
                  className="w-full"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {loading ? 'Promoting to Admin...' : 'Promote to Admin'}
                </Button>
              </div>
            )}

            {isAdmin && (
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Crown className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800">Admin Access Active</p>
                    <p className="text-green-700">
                      You have admin privileges and can access all features.
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={() => window.location.href = '/admin'}
                  className="w-full"
                >
                  Go to Admin Dashboard
                </Button>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="w-full"
              >
                Go to User Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
