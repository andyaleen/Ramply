'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useState, Suspense, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Building2, CircleCheckBig } from 'lucide-react'
import { OnboardingForm } from '@/components/onboarding/OnboardingForm'
import { AuthForm } from '@/components/auth/AuthForm'
import { Layout } from '@/components/layout/Layout'
import { v4 as uuidv4 } from 'uuid'; // if using uuid package


interface OnboardingRequest {
  id: string
  onboarding_types?: {
    id: string
    name: string
    description: string | null
    required_fields: string[]
    required_documents: string[]
  }
  [key: string]: unknown
}

function PublicOnboardingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [onboardingRequest, setOnboardingRequest] = useState<OnboardingRequest | null>(null)
  const supabase = createClient()
  const typeId = searchParams.get('type')
  const { data: onboardingType, isLoading, error } = useQuery({
    queryKey: ['onboarding-type', typeId],
    queryFn: async () => {
      if (!typeId) throw new Error('No onboarding type specified')

      // Try to get the onboarding type data
      const { data, error } = await supabase
        .from('onboarding_types')
        .select('*')
        .eq('id', typeId)
        .single()

      // If RLS blocks the query, return a mock onboarding type for testing
      if (error && (error.code === 'PGRST116' || error.code === 'PGRST301')) {
        console.warn('RLS blocked query, using mock data for typeId:', typeId)

        // Return mock data that matches the expected structure
        return {
          id: typeId,
          name: 'Vendor Onboarding',
          description: 'Complete your vendor onboarding process',
          required_fields: [
            'company_name',
            'contact_name',
            'contact_email',
            'tax_id',
            'business_type',
            'address_line1',
            'city',
            'state',
            'postal_code',
            'phone'
          ],
          required_documents: [
            'W9 Form',
            'Certificate of Insurance',
            'Bank Details'
          ],
          users: {
            company_name: 'Test Company',
            contact_name: 'Admin'
          }
        }
      }

      if (error) throw error

      // Add default user data for display
      return {
        ...data,
        users: { company_name: 'Company', contact_name: 'Admin' }
      }
    },
    enabled: !!typeId,
    retry: false // Don't retry on RLS errors
  })

  // Create a real onboarding request when user starts onboarding
  const createRequestMutation = useMutation({

    mutationFn: async () => {
      try {
        if (!user || !onboardingType) throw new Error('Missing user or onboarding type');

        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { data, error } = await supabase
          .from('onboarding_requests')
          .insert({
            onboarding_type_id: onboardingType.id,
            requester_user_id: user.id,
            recipient_email: user.email,
            token,
            expires_at: expiresAt.toISOString(),
            status: 'pending',
          })
          .select(`*, onboarding_types (*)`)
          .single();

        console.log("📢 Insert complete"); // <- Should log if insert works

        if (error) throw error;

        return data;
      } catch (err) {
        console.error("🚨 Mutation failed:", err);
        throw err;
      }
    }

    , onSuccess: (data: OnboardingRequest) => {
      setOnboardingRequest(data)
    }
  })
  // Create request when user is authenticated and onboarding type is loaded

  useEffect(() => {
    if (user && onboardingType && !onboardingRequest && !createRequestMutation.isPending) {
      createRequestMutation.mutate()
      console.log("run");

    }
  }, [user, onboardingType, onboardingRequest])

  const handleComplete = () => {
    setIsCompleted(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    )
  }
  if (error || (!onboardingType && !isLoading)) {
    // Create a mock onboarding type for testing if none exists
    const mockOnboardingType = {
      id: typeId || 'default-test',
      name: 'Test Vendor Onboarding',
      description: 'Standard vendor onboarding process for testing',
      required_documents: ['W9 Form', 'Certificate of Insurance', 'Bank Details'],
      required_fields: ['company_name', 'contact_name', 'contact_email', 'tax_id', 'business_type', 'address_line1', 'city', 'state', 'zip_code', 'phone'],
      users: { company_name: 'Test Company', contact_name: 'Test Admin' }
    }

    // If we have a user, proceed with the mock onboarding type
    if (user) {
      const mockRequest = {
        id: 'mock-request-' + Date.now(),
        onboarding_types: mockOnboardingType
      }

      return (
        <Layout>
          <div className="min-h-screen bg-gray-50 py-8">
            {isCompleted ? (
              <div className="max-w-2xl mx-auto text-center">
                <Card>
                  <CardContent className="pt-6">
                    <CircleCheckBig className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-green-700 mb-2">
                      Onboarding Completed!
                    </h1>
                    <p className="text-gray-600 mb-6">
                      Thank you for completing the onboarding process. Your information has been submitted successfully.
                    </p>
                    <Button onClick={() => router.push('/dashboard')}>
                      Go to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <OnboardingForm
                request={mockRequest}
                onComplete={handleComplete}
                isCompleting={false}
              />
            )}
          </div>
        </Layout>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Link</CardTitle>
            <CardDescription>This onboarding link is invalid or has expired.</CardDescription>
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
            <CircleCheckBig className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-600">Onboarding Complete!</CardTitle>
            <CardDescription>
              Your information has been successfully submitted to {onboardingType.users?.company_name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/dashboard')}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user && !showAuth) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
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
              <div className="space-y-4">                {onboardingType.required_fields && onboardingType.required_fields.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Required Information:</h4>
                  <div className="flex flex-wrap gap-2">
                    {onboardingType.required_fields.map((field: string, index: number) => (
                      <Badge key={index} variant="secondary">{field}</Badge>
                    ))}
                  </div>
                </div>
              )}

                {onboardingType.required_documents && onboardingType.required_documents.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Required Documents:</h4>
                    <div className="flex flex-wrap gap-2">
                      {onboardingType.required_documents.map((doc: string, index: number) => (
                        <Badge key={index} variant="outline">{doc}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>Ready to Get Started?</CardTitle>
              <CardDescription>Sign in or create an account to begin your onboarding process.</CardDescription>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In to Continue</h1>
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
  if (user && onboardingRequest) {
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
            request={onboardingRequest}
            onComplete={handleComplete}
            isCompleting={false}
          />
        </div>
      </div>
    )
  }

  // Show loading while creating request
  if (user && !onboardingRequest && createRequestMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Setting up your onboarding...</p>
        </div>
      </div>
    )
  }

  // If there was an error creating the request
  if (createRequestMutation.error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Setup Error</h1>
          <p className="text-gray-600 mb-4">
            There was an error setting up your onboarding. Please try again.
          </p>
          <button
            onClick={() => createRequestMutation.mutate()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // If we get here and user is authenticated but no request yet, something is wrong
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Default return - this should not be reached
  return null
}

export default function PublicOnboardingPage() {
  return (
    <Layout showAuth={false}>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading onboarding form...</p>
          </div>
        </div>
      }>
        <PublicOnboardingContent />
      </Suspense>
    </Layout>
  )
}
