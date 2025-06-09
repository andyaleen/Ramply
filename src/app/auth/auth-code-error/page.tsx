'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthCodeErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-4 min-h-[calc(100vh-140px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-600 p-3 rounded-full">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-sm text-red-700 font-medium">Error Details:</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <p className="text-sm text-gray-600 text-center">
            There was an error processing your authentication. This could be due to:
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>The authentication code has expired</li>
            <li>The authentication code was already used</li>
            <li>A network error occurred</li>
          </ul>
          <div className="flex flex-col space-y-2 pt-4">
            <Link href="/login">
              <Button className="w-full">
                Try Again
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-4 min-h-[calc(100vh-140px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-600 p-3 rounded-full">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <AuthCodeErrorContent />
    </Suspense>
  )
}
