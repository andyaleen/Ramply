'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { FREE_TIER_LIMIT } from '@/lib/stripe'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface BillingInfo {
  isSubscribed: boolean
  subscriptionStatus: string | null
  connectedCount: number
  periodEnd: string | null
}

export default function BillingPage() {
  const { company, profileLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checkoutPending, setCheckoutPending] = useState(false)
  const [portalPending, setPortalPending] = useState(false)
  const supabase = createClient()

  // Show toast on return from Stripe
  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast.success('Subscription activated! Welcome to Ramply Pro.')
    } else if (searchParams.get('canceled') === '1') {
      toast.info('Checkout canceled — your plan was not changed.')
    }
  }, [searchParams])

  const { data: billing, isLoading } = useQuery<BillingInfo>({
    queryKey: ['billing', company?.id],
    queryFn: async () => {
      if (!company) return { isSubscribed: false, subscriptionStatus: null, connectedCount: 0, periodEnd: null }

      const { data: co } = await supabase
        .from('companies')
        .select('subscription_status, subscription_current_period_end')
        .eq('id', company.id)
        .single()

      const { data: connections } = await supabase
        .from('share_requests')
        .select('completed_by_company_id')
        .eq('requester_company_id', company.id)
        .eq('status', 'completed')
        .not('completed_by_company_id', 'is', null)

      const connectedCount = new Set(
        (connections ?? []).map((r) => r.completed_by_company_id)
      ).size

      const status = co?.subscription_status ?? null
      return {
        isSubscribed: status === 'active' || status === 'trialing',
        subscriptionStatus: status,
        connectedCount,
        periodEnd: co?.subscription_current_period_end ?? null,
      }
    },
    enabled: !!company,
  })

  /** Redirect to Stripe Checkout. */
  const handleUpgrade = async () => {
    setCheckoutPending(true)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Failed to start checkout')
      window.location.href = json.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setCheckoutPending(false)
    }
  }

  /** Redirect to Stripe Customer Portal to manage / cancel. */
  const handleManage = async () => {
    setPortalPending(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Failed to open portal')
      window.location.href = json.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setPortalPending(false)
    }
  }

  if (profileLoading || isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    )
  }

  const atLimit = !billing?.isSubscribed && (billing?.connectedCount ?? 0) >= FREE_TIER_LIMIT

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-gray-600">Manage your Ramply subscription</p>
        </div>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            {billing?.isSubscribed ? (
              <Badge className="bg-green-100 text-green-800">Pro</Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
          </div>
          <CardDescription>
            {billing?.isSubscribed
              ? `Your subscription renews on ${billing.periodEnd ? new Date(billing.periodEnd).toLocaleDateString() : '—'}.`
              : `Free plan includes up to ${FREE_TIER_LIMIT} connected companies.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{billing?.connectedCount ?? 0}</span>
            <span className="text-gray-500">/ {billing?.isSubscribed ? '∞' : FREE_TIER_LIMIT} companies connected</span>
          </div>
          {atLimit && (
            <p className="mt-2 text-sm text-red-600 font-medium">
              You have reached the free tier limit. Upgrade to connect with more companies.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      {!billing?.isSubscribed && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Ramply Pro
            </CardTitle>
            <CardDescription>Unlimited connected companies and priority support.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {[
                'Unlimited share requests',
                'Unlimited connected companies',
                'Priority email support',
                'Advanced analytics (coming soon)',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button onClick={handleUpgrade} disabled={checkoutPending} className="w-full">
              {checkoutPending ? 'Redirecting to checkout…' : 'Upgrade to Pro'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manage existing subscription */}
      {billing?.isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>Update payment method, view invoices, or cancel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleManage} disabled={portalPending}>
              {portalPending ? 'Opening portal…' : 'Manage in Stripe'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
