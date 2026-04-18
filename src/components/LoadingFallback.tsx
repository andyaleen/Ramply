'use client'

import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

const serifTitle = "font-['Instrument_Serif',serif] tracking-tight"
const sansBody = "font-['DM_Sans',sans-serif]"

interface LoadingFallbackProps {
  title?: string
  description?: string
  showTimeoutWarning?: boolean
  onRefresh?: () => void
  timeoutMs?: number
}

/**
 * Full-page loading state that matches the April 2026 Ramply palette:
 * warm-gray background, serif headline, muted sage secondary text, and a
 * single brand-green progress spinner. Kept intentionally minimal so any
 * brief flash between route transitions feels on-brand instead of jarring.
 */
export function LoadingFallback({
  title = 'Loading',
  description = 'One moment while we get things ready…',
  showTimeoutWarning = true,
  onRefresh,
  timeoutMs = 10000,
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
    <div
      className={`${sansBody} min-h-screen flex items-center justify-center bg-[#F0EFE9] text-[#0F1F18] px-6`}
    >
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DDDCD5] bg-white">
            <Loader2 className="h-5 w-5 animate-spin text-[#287253]" aria-hidden />
          </span>
        </div>

        <h1
          className={`${serifTitle} mt-6 text-[32px] leading-tight text-[#0F1F18]`}
        >
          {title}
        </h1>
        <p className="mt-3 text-[14px] font-light leading-relaxed text-[#4A5C54]">
          {description}
        </p>

        {showTimeout && (
          <div className="mt-8 rounded-xl border border-[#DDDCD5] bg-white p-4 text-left">
            <div className="flex items-center gap-2 text-[#0F1F18]">
              <AlertCircle className="h-4 w-4 text-[#287253]" aria-hidden />
              <p className="text-sm font-medium">Taking longer than expected</p>
            </div>
            <p className="mt-2 text-sm text-[#7A8C84]">
              This might be a slow connection. You can keep waiting or try again.
            </p>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="mt-3 w-full border-[#DDDCD5] text-[#0F1F18] hover:border-[#287253] hover:text-[#287253]"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Compact spinner for inline use inside a page or card. */
export function LoadingSpinner({
  size = 'md',
  text,
}: {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div className="flex items-center justify-center gap-2 text-[#4A5C54]">
      <Loader2 className={`animate-spin text-[#287253] ${sizeClasses[size]}`} />
      {text && <span className="text-sm">{text}</span>}
    </div>
  )
}
