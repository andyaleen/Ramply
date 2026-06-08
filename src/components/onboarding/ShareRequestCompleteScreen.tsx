'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const DASHBOARD_REDIRECT_MS = 5000
export const RECEIVED_REQUESTS_PATH = '/dashboard/received'

/**
 * Shown after a recipient successfully fulfills a share request.
 */
export function ShareRequestCompleteScreen() {
  const router = useRouter()

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      router.replace('/dashboard')
    }, DASHBOARD_REDIRECT_MS)

    return () => {
      window.clearTimeout(redirectTimer)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-600 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>All Done!</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">Your information has been shared successfully.</span>
            <span className="block text-[#5D6D66]">
              Redirecting you to your dashboard in a few seconds…
            </span>
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(RECEIVED_REQUESTS_PATH)}
          >
            Back to Pending Requests
          </Button>
        </div>
      </Card>
    </div>
  )
}
