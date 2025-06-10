'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface LoadingFallbackProps {
  title?: string
  description?: string
  showTimeoutWarning?: boolean
  onRefresh?: () => void
  timeoutMs?: number
}

export function LoadingFallback({ 
  title = "Loading...", 
  description = "Please wait while we set up your session",
  showTimeoutWarning = true,
  onRefresh,
  timeoutMs = 10000 // 10 seconds
}: LoadingFallbackProps) {
  const [showTimeout, setShowTimeout] = useState(false)
  
  useEffect(() => {
    if (!showTimeoutWarning) return
    
    const timer = setTimeout(() => {
      setShowTimeout(true)
    }, timeoutMs)
    
    return () => clearTimeout(timer)
  }, [showTimeoutWarning, timeoutMs])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full relative">
              <Building2 className="h-6 w-6 text-white" />
              <Loader2 className="h-4 w-4 text-white animate-spin absolute -top-1 -right-1" />
            </div>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Loading skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          
          {/* Timeout warning */}
          {showTimeout && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm font-medium">Taking longer than expected</p>
              </div>
              <p className="text-sm text-yellow-700">
                This might be due to a slow network connection or server issues.
              </p>
              {onRefresh && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRefresh}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          )}
          
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Connecting to server...
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Simpler loading spinner for inline use
export function LoadingSpinner({ size = "md", text }: { size?: "sm" | "md" | "lg"; text?: string }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }
  
  return (
    <div className="flex items-center justify-center gap-2">
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  )
}
