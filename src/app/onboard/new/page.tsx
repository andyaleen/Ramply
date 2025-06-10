'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AuthForm } from '@/components/auth/AuthForm'
import { OnboardingForm } from '@/components/onboarding/OnboardingForm'
import { Layout } from '@/components/layout'
import { Building2, ArrowRight, CheckCircle } from 'lucide-react'

function PublicOnboardingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const supabase = createClient()
  
  const typeId = searchParams.get('type')

  const { data: onboardingType, isLoading, error } = useQuery({
    queryKey: ['onboarding-type', typeId],
    queryFn: async () => {
      if (!typeId) throw new Error('No onboarding type specified')
      
      const { data, error } = await supabase
        .from('onboarding_types')
        .select(`
          *,
          users:user_id(company_name, contact_name)
        `)
        .eq('id', typeId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!typeId,
  })

  const handleComplete = () => {
    setIsCompleted(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !onboardingType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Link</CardTitle>
            <CardDescription>
              This onboarding link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-600">Onboarding Complete!</CardTitle>
            <CardDescription>
              Your information has been successfully submitted to {onboardingType.users?.company_name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/')}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user && !showAuth) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-blue-600 p-3 rounded-lg w-fit mx-auto mb-4">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to {onboardingType.users?.company_name}
            </h1>
            <p className="text-gray-600 text-lg">
              Complete your <span className="font-semibold">{onboardingType.name}</span> onboarding
            </p>
          </div>

          {/* Onboarding Type Info */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {onboardingType.name}
                <Badge variant="outline">
                  {onboardingType.required_documents?.length || 0} Documents Required
                </Badge>
              </CardTitle>
              <CardDescription>
                {onboardingType.description || 'Complete this onboarding flow to get started.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Required Fields */}
                {onboardingType.required_fields && onboardingType.required_fields.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Required Information:</h4>
                    <div className="flex flex-wrap gap-2">
                      {onboardingType.required_fields.map((field: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required Documents */}
                {onboardingType.required_documents && onboardingType.required_documents.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Required Documents:</h4>
                    <div className="flex flex-wrap gap-2">
                      {onboardingType.required_documents.map((doc: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {doc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Get Started Section */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Ready to Get Started?</CardTitle>
              <CardDescription>
                Sign in or create an account to begin your onboarding process.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" onClick={() => setShowAuth(true)}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Start Onboarding
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (showAuth && !user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Sign In to Continue
            </h1>
            <p className="text-gray-600">
              Access your account to complete the {onboardingType.name} onboarding.
            </p>
          </div>
          <AuthForm />
        </div>
      </div>
    )
  }

  // User is authenticated, show the onboarding form
  const mockRequest = {
    id: `mock-${typeId}`,
    onboarding_types: {
      required_fields: onboardingType.required_fields || [],
      required_documents: onboardingType.required_documents || [],
    },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {onboardingType.name} - {onboardingType.users?.company_name}
          </h1>
          <p className="text-gray-600">
            Please complete all required fields and upload necessary documents.
          </p>
        </div>
        
        <OnboardingForm
          request={mockRequest}
          onComplete={handleComplete}
          isCompleting={false}
        />
      </div>
    </div>
  )
}

export default function PublicOnboardingPage() {
  return (
    <Layout showAuth={false}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }>
        <PublicOnboardingContent />
      </Suspense>
    </Layout>
  )
}
