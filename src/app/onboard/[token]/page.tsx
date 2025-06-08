'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AuthForm } from '@/components/auth/AuthForm'
import { OnboardingForm } from '@/components/onboarding/OnboardingForm'
import { Layout } from '@/components/layout'
import { CheckCircle, AlertCircle, Clock } from 'lucide-react'

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const supabase = createClient()
  const token = params.token as string

  const { data: request, isLoading, error } = useQuery({
    queryKey: ['onboarding-request', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_requests')
        .select(`
          *,
          onboarding_types(*),
          users:requester_user_id(company_name, contact_name)
        `)
        .eq('token', token)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!token,
  })

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !request) return

      const { error } = await supabase
        .from('onboarding_requests')
        .update({
          status: 'completed',
          completed_by: user.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (error) throw error
    },
    onSuccess: () => {
      router.push('/onboarding/success')
    },
  })

  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuth(true)
    }
  }, [authLoading, user])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-600 p-3 rounded-full">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle>Invalid Onboarding Link</CardTitle>
            <CardDescription>
              This onboarding link is invalid or has expired. Please contact the requester for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!user && showAuth) {
    return <AuthForm />
  }

  if (request.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-600 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle>Onboarding Completed</CardTitle>
            <CardDescription>
              You have already completed this onboarding request.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (request.status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-600 p-3 rounded-full">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle>Onboarding Expired</CardTitle>
            <CardDescription>
              This onboarding request has expired. Please contact the requester for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }
  return (
    <Layout showAuth={false}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <Badge className="bg-blue-100 text-blue-800">Pending</Badge>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {request.onboarding_types?.name || 'Onboarding Request'}
          </h2>
          <p className="text-gray-600 mb-4">
            Requested by <strong>{request.users?.company_name}</strong>
          </p>
          {request.onboarding_types?.description && (
            <p className="text-gray-700 bg-white rounded-lg p-4 border">
              {request.onboarding_types.description}
            </p>
          )}
        </div>

        <OnboardingForm
          request={request}
          onComplete={() => completeMutation.mutate()}
          isCompleting={completeMutation.isPending}        />
      </main>
      </div>
    </Layout>
  )
}
