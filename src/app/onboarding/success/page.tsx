'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layout } from '@/components/layout'
import { CheckCircle, ArrowLeft } from 'lucide-react'

export default function OnboardingSuccessPage() {
  const router = useRouter()
  return (
    <Layout showAuth={false}>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="text-center">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-600 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Onboarding Complete!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Thank you for completing your onboarding. Your information has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 border-t">
            <div className="space-y-4 text-left mb-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">What happens next?</h3>
                <ul className="space-y-2 text-green-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Your information is being reviewed by our team</span>
                  </li>                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>You&apos;ll receive an email confirmation shortly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>We&apos;ll contact you if any additional information is needed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Your onboarding status will be updated once approved</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Need help?</h3>
                <p className="text-blue-700">
                  If you have any questions about your onboarding status or need to update any information, 
                  please contact the team that sent you this onboarding request.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => window.close()}
                className="min-w-32"
              >
                Close Window
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="min-w-32"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </div>
          </CardContent>        </Card>
      </main>
      </div>
    </Layout>
  )
}
