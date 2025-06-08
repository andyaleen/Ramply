'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface User {
  id: string
  email: string
  role: string
  created_at: string
}

export default function DebugPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [testEmail, setTestEmail] = useState('chandrayee.cse@gmail.com')
  const [testPassword, setTestPassword] = useState('test123456')
  const [authResult, setAuthResult] = useState('')
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        setError(`Users table error: ${usersError.message}`)
      } else {
        setUsers(usersData || [])
      }
    } catch {
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const createTestUser = async () => {
    setAuthResult('Creating test user...')
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      })

      if (error) {
        setAuthResult(`❌ Sign up error: ${error.message}`)
      } else {
        setAuthResult(`✅ Test user created successfully!
User ID: ${data.user?.id}
Email: ${data.user?.email}
Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No - Check your email!'}`)
        console.log('Test user created:', data)
        fetchUsers()
      }
    } catch {
      setAuthResult('❌ Failed to create test user')
    }
  }

  const testSignIn = async () => {
    setAuthResult('Testing sign in...')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      })

      if (error) {
        setAuthResult(`❌ Sign in error: ${error.message}`)
      } else {
        setAuthResult(`✅ Sign in successful!
User ID: ${data.user?.id}
Email: ${data.user?.email}
Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`)
        console.log('Sign in successful:', data)
      }
    } catch {
      setAuthResult('❌ Failed to test sign in')
    }
  }

  const resetPassword = async () => {
    setAuthResult('Sending password reset...')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(testEmail)

      if (error) {
        setAuthResult(`❌ Password reset error: ${error.message}`)
      } else {
        setAuthResult(`✅ Password reset email sent to ${testEmail}`)
      }
    } catch {
      setAuthResult('❌ Failed to send password reset')
    }
  }

  const resendConfirmation = async () => {
    setAuthResult('Resending confirmation email...')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: testEmail,
      })

      if (error) {
        setAuthResult(`❌ Resend error: ${error.message}`)
      } else {
        setAuthResult(`✅ Confirmation email resent to ${testEmail}
Please check your email (including spam folder) for the confirmation link.`)
      }
    } catch {
      setAuthResult('❌ Failed to resend confirmation')
    }
  }

  const checkUserStatus = async () => {
    setAuthResult('Checking user status...')
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userData.user) {        setAuthResult(`📊 User Status:
ID: ${userData.user.id}
Email: ${userData.user.email}
Email Confirmed: ${userData.user.email_confirmed_at ? '✅ Yes' : '❌ No'}
Created: ${userData.user.created_at}
Last Sign In: ${userData.user.last_sign_in_at || 'Never'}

${userData.user.email_confirmed_at ? '✅ User is confirmed and should be able to sign in' : '⚠️ User needs to confirm email before signing in'}`)
      } else if (userError) {
        setAuthResult(`❌ User check error: ${userError.message}`)
      } else {
        setAuthResult(`❌ No user found with email: ${testEmail}
This user may not exist yet. Try creating the account first.`)
      }
    } catch {
      setAuthResult('❌ Failed to check user status')
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
                    <CardTitle>🔍 Authentication Debug Center</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    <Tabs defaultValue="test" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="test">Test Auth</TabsTrigger>
                            <TabsTrigger value="users">Database Users</TabsTrigger>
                            <TabsTrigger value="info">Troubleshooting</TabsTrigger>
                        </TabsList>

                        <TabsContent value="test" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Test Credentials</h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="test-email">Email</Label>
                                        <Input
                                            id="test-email"
                                            type="email"
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                            placeholder="Enter email to test"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="test-password">Password</Label>
                                        <Input
                                            id="test-password"
                                            type="password"
                                            value={testPassword}
                                            onChange={(e) => setTestPassword(e.target.value)}
                                            placeholder="Enter password to test"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Button onClick={createTestUser} className="w-full" variant="outline">
                                            📝 Create Account
                                        </Button>
                                        <Button onClick={testSignIn} className="w-full">
                                            🔑 Test Sign In
                                        </Button>
                                        <Button onClick={resetPassword} className="w-full" variant="secondary">
                                            🔄 Send Password Reset
                                        </Button>
                                        <Button onClick={resendConfirmation} className="w-full" variant="secondary">
                                            📧 Resend Confirmation Email
                                        </Button>
                                        <Button onClick={checkUserStatus} className="w-full" variant="secondary">
                                            📊 Check User Status
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Test Results</h3>
                                    <div className="p-4 bg-gray-50 rounded min-h-[200px] whitespace-pre-wrap">
                                        {authResult || 'No tests run yet. Click a button to test authentication.'}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="users" className="space-y-4">
                            <h3 className="text-lg font-semibold">Users in Database ({users.length})</h3>
                            <div className="space-y-2">
                                {users.length === 0 ? (
                                    <p className="text-gray-600 p-4 bg-gray-50 rounded">
                                        No users found in the database. Try creating a test user first.
                                    </p>
                                ) : (                                    users.map((user) => (
                                        <div key={user.id} className="p-4 border rounded-lg">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p><strong>Email:</strong> {user.email}</p>
                                                    <p><strong>Role:</strong> {user.role}</p>
                                                </div>
                                                <div>
                                                    <p><strong>ID:</strong> {user.id.substring(0, 8)}...</p>
                                                    <p><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="info" className="space-y-4">
                            <div className="space-y-6">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <h4 className="font-semibold mb-2">🚨 Common Issues & Solutions</h4>
                                    <ul className="list-disc pl-5 space-y-2 text-sm">
                                        <li><strong>Invalid login credentials:</strong> User doesn&apos;t exist or password is wrong</li>
                                        <li><strong>Email not confirmed:</strong> Check your email for confirmation link</li>
                                        <li><strong>User already registered:</strong> Account exists, try signing in instead</li>
                                        <li><strong>Signup email not received:</strong> Check spam folder or try different email</li>
                                    </ul>
                                </div>

                                <div className="p-4 bg-green-50 rounded-lg">
                                    <h4 className="font-semibold mb-2">✅ Testing Steps</h4>
                                    <ol className="list-decimal pl-5 space-y-1 text-sm">
                                        <li>Enter your email and a test password</li>
                                        <li>Click &quot;Create Account&quot; to sign up</li>
                                        <li>Check your email for confirmation link and click it</li>
                                        <li>Return here and click &quot;Test Sign In&quot;</li>
                                        <li>If successful, try the main login page</li>
                                    </ol>
                                </div>

                                <div className="p-4 bg-yellow-50 rounded-lg">
                                    <h4 className="font-semibold mb-2">⚠️ Important Notes</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        <li>Supabase requires email confirmation by default</li>
                                        <li>Users must click the email confirmation link before signing in</li>
                                        <li>Check your Supabase project settings for email configuration</li>
                                        <li>Development mode may have different email confirmation rules</li>
                                    </ul>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
