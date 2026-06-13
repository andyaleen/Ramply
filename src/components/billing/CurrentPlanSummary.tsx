'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_LABELS } from '@/lib/billing-plans'
import {
  CLASSIC_MONTHLY_LIMIT,
  FREE_REQUEST_LIMIT,
  type SubscriptionPlan,
} from '@/lib/plan-limits'

interface CurrentPlanSummaryProps {
  plan: SubscriptionPlan
  isSubscribed: boolean
  isBillingExempt: boolean
  totalSent: number
  monthlySent: number
  periodEnd: string | null
}

/** Displays the signed-in user's current Ramply plan and usage in a compact table. */
export function CurrentPlanSummary({
  plan,
  isSubscribed,
  isBillingExempt,
  totalSent,
  monthlySent,
  periodEnd,
}: CurrentPlanSummaryProps) {
  const planLabel = isBillingExempt ? 'Team (Unlimited)' : PLAN_LABELS[plan]
  const statusLabel = isBillingExempt
    ? 'Internal team account'
    : isSubscribed
      ? 'Active subscription'
      : 'Free tier'

  const usageLabel = isBillingExempt
    ? `${monthlySent} requests sent this month (unlimited)`
    : plan === 'free'
      ? `${totalSent} / ${FREE_REQUEST_LIMIT} free requests used`
      : plan === 'classic'
        ? `${monthlySent} / ${CLASSIC_MONTHLY_LIMIT} requests this month`
        : `${monthlySent} requests sent this month`

  const renewalLabel = isBillingExempt
    ? 'Not billed'
    : isSubscribed
      ? periodEnd
        ? new Date(periodEnd).toLocaleDateString()
        : '—'
      : 'No renewal'

  const description = isBillingExempt
    ? 'This account has unlimited share requests and is not billed.'
    : isSubscribed
      ? 'Your paid subscription is active.'
      : `Includes ${FREE_REQUEST_LIMIT} free share requests to get started.`

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Current Plan</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <tbody>
              <PlanRow label="Plan">
                <Badge
                  className={isSubscribed || isBillingExempt ? 'bg-green-100 text-green-800' : ''}
                  variant={isSubscribed || isBillingExempt ? 'default' : 'secondary'}
                >
                  {planLabel}
                </Badge>
              </PlanRow>
              <PlanRow label="Status">{statusLabel}</PlanRow>
              <PlanRow label="Usage">{usageLabel}</PlanRow>
              <PlanRow label="Renews">{renewalLabel}</PlanRow>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function PlanRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b last:border-b-0">
      <th scope="row" className="w-1/3 bg-muted/40 px-4 py-3 text-left font-medium text-muted-foreground">
        {label}
      </th>
      <td className="px-4 py-3 text-left">{children}</td>
    </tr>
  )
}
