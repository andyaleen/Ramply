'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import type { SubscriptionPlan } from '@/lib/plan-limits'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SubscriptionManagePanel } from '@/components/billing/SubscriptionManagePanel'

interface BillingInfo {
  plan: SubscriptionPlan
  isSubscribed: boolean
  isBillingExempt: boolean
}

export default function BillingManagePage() {
  const { company, profileLoading } = useAuth()

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
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="h-40" />
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
          <h1 className="text-3xl font-bold tracking-tight">Modify Subscription</h1>
          <p className="text-gray-600">
            Upgrade, downgrade, switch to Free, or permanently delete your account.
          </p>
        </div>

        <SubscriptionManagePanel
          currentPlan={billing?.plan ?? 'free'}
          isSubscribed={billing?.isSubscribed ?? false}
          isBillingExempt={billing?.isBillingExempt ?? false}
        />

        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/dashboard/billing">Back to Billing</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
