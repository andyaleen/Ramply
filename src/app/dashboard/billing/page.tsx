'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import type { SubscriptionPlan } from '@/lib/plan-limits'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CurrentPlanSummary } from '@/components/billing/CurrentPlanSummary'
import { toast } from 'sonner'

interface BillingInfo {
  plan: SubscriptionPlan
  isSubscribed: boolean
  isBillingExempt: boolean
  subscriptionStatus: string | null
  totalSent: number
  monthlySent: number
  periodEnd: string | null
}

export default function BillingPage() {
  const { company, profileLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      const plan = searchParams.get('plan')
      const label = plan === 'pro' ? 'Ramply Pro' : plan === 'classic' ? 'Classic' : 'paid plan'
      toast.success(`Subscription activated! Welcome to ${label}.`)
    } else if (searchParams.get('canceled') === '1') {
      toast.info('Checkout canceled — your plan was not changed.')
    }
  }, [searchParams])

  const { data: billing, isLoading } = useQuery<BillingInfo>({
    queryKey: ['billing', company?.id],
    queryFn: async () => {
      const res = await fetch('/api/billing/status', { credentials: 'include' })
      if (!res.ok) {
        throw new Error('Failed to load billing status')
      }
      return res.json() as Promise<BillingInfo>
    },
    enabled: !!company,
  })

  if (profileLoading || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          {[...Array(2)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-gray-600">Manage your Ramply subscription</p>
        </div>

        <CurrentPlanSummary
          plan={billing?.plan ?? 'free'}
          isSubscribed={billing?.isSubscribed ?? false}
          isBillingExempt={billing?.isBillingExempt ?? false}
          totalSent={billing?.totalSent ?? 0}
          monthlySent={billing?.monthlySent ?? 0}
          periodEnd={billing?.periodEnd ?? null}
        />

        <div className="flex justify-center">
          <Button onClick={() => router.push('/dashboard/billing/manage')}>
            Modify / Cancel Subscription
          </Button>
        </div>
      </div>
    </div>
  )
}
