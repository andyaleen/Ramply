'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  CLASSIC_MONTHLY_LIMIT,
  FREE_REQUEST_LIMIT,
  getMonthStartUtc,
  getPlanFromPriceId,
  isActiveSubscription,
  type SubscriptionPlan,
} from '@/lib/plan-limits'
import type { CheckoutPlan } from '@/lib/stripe'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface BillingInfo {
  plan: SubscriptionPlan
  isSubscribed: boolean
  subscriptionStatus: string | null
  totalSent: number
  monthlySent: number
  periodEnd: string | null
}

const planLabels: Record<SubscriptionPlan, string> = {
  free: 'Free',
  classic: 'Classic',
  pro: 'Ramply Pro',
}

export default function BillingPage() {
  const { company, profileLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checkoutPending, setCheckoutPending] = useState<CheckoutPlan | null>(null)
  const [portalPending, setPortalPending] = useState(false)
  const supabase = createClient()

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
      if (!company) {
        return {
          plan: 'free' as const,
          isSubscribed: false,
          subscriptionStatus: null,
          totalSent: 0,
          monthlySent: 0,
          periodEnd: null,
        }
      }

      const { data: co } = await supabase
        .from('companies')
        .select('subscription_status, subscription_price_id, subscription_current_period_end')
        .eq('id', company.id)
        .single()

      const monthStart = getMonthStartUtc().toISOString()

      const [{ count: totalSent }, { count: monthlySent }] = await Promise.all([
        supabase
          .from('share_requests')
          .select('id', { count: 'exact', head: true })
          .eq('requester_company_id', company.id),
        supabase
          .from('share_requests')
          .select('id', { count: 'exact', head: true })
          .eq('requester_company_id', company.id)
          .gte('created_at', monthStart),
      ])

      const status = co?.subscription_status ?? null
      const subscribed = isActiveSubscription(status)
      const plan = subscribed ? getPlanFromPriceId(co?.subscription_price_id) : 'free'

      return {
        plan,
        isSubscribed: subscribed,
        subscriptionStatus: status,
        totalSent: totalSent ?? 0,
        monthlySent: monthlySent ?? 0,
        periodEnd: co?.subscription_current_period_end ?? null,
      }
    },
    enabled: !!company,
  })

  const handleUpgrade = async (plan: CheckoutPlan) => {
    setCheckoutPending(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Failed to start checkout')
      window.location.href = json.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setCheckoutPending(null)
    }
  }

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

  const usageLabel = billing?.plan === 'free'
    ? `${billing?.totalSent ?? 0} / ${FREE_REQUEST_LIMIT} free requests used`
    : billing?.plan === 'classic'
      ? `${billing?.monthlySent ?? 0} / ${CLASSIC_MONTHLY_LIMIT} requests this month`
      : `${billing?.monthlySent ?? 0} requests sent this month`

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge className={billing?.isSubscribed ? 'bg-green-100 text-green-800' : ''} variant={billing?.isSubscribed ? 'default' : 'secondary'}>
              {planLabels[billing?.plan ?? 'free']}
            </Badge>
          </div>
          <CardDescription>
            {billing?.isSubscribed
              ? `Your subscription renews on ${billing.periodEnd ? new Date(billing.periodEnd).toLocaleDateString() : '—'}.`
              : `Includes ${FREE_REQUEST_LIMIT} free share requests to get started.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{usageLabel}</p>
          <Button variant="link" className="px-0 mt-2" onClick={() => router.push('/pricing')}>
            View all plans
          </Button>
        </CardContent>
      </Card>

      {billing?.plan !== 'pro' && (
        <div className="space-y-4">
          <PlanOffer
            title="Ramply Pro"
            price="$45/mo plus taxes"
            highlight="Unlimited share requests"
            features={['Unlimited share requests', 'Priority email support']}
            emphasized
            onSelect={() => handleUpgrade('pro')}
            pending={checkoutPending === 'pro'}
          />
          {billing?.plan !== 'classic' && (
            <PlanOffer
              title="Classic"
              price="$18/mo plus taxes"
              highlight="Up to 20 share requests a month"
              features={['20 share requests per month', 'Email support']}
              onSelect={() => handleUpgrade('classic')}
              pending={checkoutPending === 'classic'}
            />
          )}
        </div>
      )}

      {billing?.isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>Update payment method, view invoices, or change plans.</CardDescription>
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

interface PlanOfferProps {
  title: string
  price: string
  highlight: string
  features: string[]
  emphasized?: boolean
  pending: boolean
  onSelect: () => void
}

function PlanOffer({ title, price, highlight, features, emphasized, pending, onSelect }: PlanOfferProps) {
  return (
    <Card className={emphasized ? 'border-[#287253] bg-[#F8FAF9]' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {emphasized && <Zap className="h-5 w-5 text-[#287253]" />}
          {title}
        </CardTitle>
        <CardDescription>{price}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium text-[#287253]">{highlight}</p>
        <ul className="space-y-2 text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#287253] shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
        <Button onClick={onSelect} disabled={pending} className="w-full">
          {pending ? 'Redirecting to checkout…' : `Upgrade to ${title}`}
        </Button>
      </CardContent>
    </Card>
  )
}
