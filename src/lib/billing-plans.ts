import {
  CLASSIC_MONTHLY_LIMIT,
  FREE_REQUEST_LIMIT,
  type SubscriptionPlan,
} from '@/lib/plan-limits'

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Free',
  classic: 'Classic',
  pro: 'Ramply Pro',
}

export interface PlanOption {
  id: SubscriptionPlan
  title: string
  price: string
  summary: string
  features: string[]
}

export const PLAN_OPTIONS: PlanOption[] = [
  {
    id: 'free',
    title: 'Free',
    price: '$0',
    summary: 'Keep your data, but you cannot send new share requests once you reach the free limit.',
    features: [
      `${FREE_REQUEST_LIMIT} share requests included`,
      'View responses and documents you already have',
      'No credit card required',
    ],
  },
  {
    id: 'classic',
    title: 'Classic',
    price: '$18/mo plus taxes',
    summary: `Up to ${CLASSIC_MONTHLY_LIMIT} share requests per month.`,
    features: [
      `${CLASSIC_MONTHLY_LIMIT} share requests per month`,
      'Unlimited connected companies',
      'Email support',
    ],
  },
  {
    id: 'pro',
    title: 'Ramply Pro',
    price: '$45/mo plus taxes',
    summary: 'Unlimited share requests for growing vendor programs.',
    features: [
      'Unlimited share requests',
      'Unlimited connected companies',
      'Priority email support',
    ],
  },
]
