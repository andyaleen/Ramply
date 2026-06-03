'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function AuthCodeErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Authentication failed'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-600 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-900">
            Authentication Error
          </CardTitle>
          <CardDescription className="text-red-700">
            There was a problem with your authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600 text-center">
              This may happen if:
            </p>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>The link has expired or was already used</li>
              <li>The reset was opened in a different browser than where you requested it</li>
              <li>Request a new reset link from the same browser you use to sign in</li>
            </ul>
          </div>

          <div className="flex flex-col space-y-2">
            <Link href="/login">
              <Button className="w-full">
                Request a new reset link
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-center mt-4 text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthCodeErrorContent />
    </Suspense>
  )
}
