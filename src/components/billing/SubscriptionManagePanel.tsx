'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PLAN_LABELS, PLAN_OPTIONS } from '@/lib/billing-plans'
import type { CheckoutPlan } from '@/lib/stripe'
import type { SubscriptionPlan } from '@/lib/plan-limits'

interface SubscriptionManagePanelProps {
  currentPlan: SubscriptionPlan
  isSubscribed: boolean
  isBillingExempt: boolean
}

/** Plan changes, free-tier downgrade, and permanent account deletion. */
export function SubscriptionManagePanel({
  currentPlan,
  isSubscribed,
  isBillingExempt,
}: SubscriptionManagePanelProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletePending, setDeletePending] = useState(false)

  const invalidateBilling = async () => {
    await queryClient.invalidateQueries({ queryKey: ['billing'] })
  }

  const handlePaidPlan = async (plan: CheckoutPlan) => {
    setPendingPlan(plan)
    try {
      if (!isSubscribed) {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        })
        const json = await res.json() as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Failed to start checkout')
        window.location.href = json.url
        return
      }

      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed to change plan')

      toast.success(`Your plan is now ${PLAN_LABELS[plan]}.`)
      await invalidateBilling()
      router.push('/dashboard/billing')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPendingPlan(null)
    }
  }

  const handleFreeTier = async () => {
    setPendingPlan('free')
    try {
      const res = await fetch('/api/billing/cancel-subscription', { method: 'POST' })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed to switch to free tier')

      toast.success('You are now on the Free tier. Your data is still available.')
      await invalidateBilling()
      router.push('/dashboard/billing')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPendingPlan(null)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Type DELETE to confirm account deletion.')
      return
    }

    setDeletePending(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed to delete account')

      toast.success('Your account has been deleted.')
      window.location.href = '/'
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setDeletePending(false)
    }
  }

  if (isBillingExempt) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Team account</CardTitle>
          <CardDescription>
            This account is on an internal unlimited plan and cannot be changed here.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {PLAN_OPTIONS.map((option) => {
          const isCurrent = option.id === currentPlan
          const isPending = pendingPlan === option.id

          return (
            <Card
              key={option.id}
              className={option.id === 'pro' ? 'border-[#287253] bg-[#F8FAF9]' : undefined}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {option.id === 'pro' && <Zap className="h-5 w-5 text-[#287253]" />}
                      {option.title}
                    </CardTitle>
                    <CardDescription>{option.price}</CardDescription>
                  </div>
                  {isCurrent && <Badge className="bg-green-100 text-green-800">Current plan</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-medium text-[#287253]">{option.summary}</p>
                <ul className="space-y-2 text-sm">
                  {option.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-[#287253]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? 'secondary' : option.id === 'free' ? 'outline' : 'default'}
                  disabled={isCurrent || isPending || pendingPlan !== null}
                  onClick={() => {
                    if (option.id === 'free') {
                      void handleFreeTier()
                      return
                    }
                    void handlePaidPlan(option.id)
                  }}
                >
                  {isCurrent
                    ? 'Current plan'
                    : isPending
                      ? 'Updating…'
                      : option.id === 'free'
                        ? 'Switch to Free tier'
                        : currentPlan === 'free' || !isSubscribed
                          ? `Subscribe to ${option.title}`
                          : `Switch to ${option.title}`}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-red-200">
        <CardHeader className="text-center">
          <CardTitle className="text-red-700">Delete account</CardTitle>
          <CardDescription>
            Permanently delete your Ramply account and all associated company data. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm.
          </p>
          <Input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            aria-label="Type DELETE to confirm account deletion"
          />
          <Button
            variant="destructive"
            className="w-full"
            disabled={deletePending || deleteConfirmation !== 'DELETE'}
            onClick={() => void handleDeleteAccount()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deletePending ? 'Deleting account…' : 'Delete account'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
