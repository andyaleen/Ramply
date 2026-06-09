'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'

import { serifTitle } from '@/components/marketing/marketing-styles'
import type { CheckoutPlan } from '@/lib/stripe'

interface PricingPlanCardsProps {
  isAuthenticated: boolean
}

const proFeatures = [
  'Unlimited share requests',
  'Unlimited connected companies',
  'Priority email support',
  'Multi-step workflows (coming soon)',
]

const classicFeatures = [
  'Up to 20 share requests a month',
  'Unlimited connected companies',
  'Email support',
]

/** Planet Fitness–style plan picker with Ramply Pro on the left and Classic on the right. */
export function PricingPlanCards({ isAuthenticated }: PricingPlanCardsProps) {
  const router = useRouter()
  const [pendingPlan, setPendingPlan] = useState<CheckoutPlan | null>(null)

  const handleSelect = async (plan: CheckoutPlan) => {
    if (!isAuthenticated) {
      router.push(`/signup?plan=${plan}`)
      return
    }

    setPendingPlan(plan)
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
      setPendingPlan(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-[980px] mx-auto">
      <ProPlanCard
        pending={pendingPlan === 'pro'}
        onSelect={() => handleSelect('pro')}
      />
      <ClassicPlanCard
        pending={pendingPlan === 'classic'}
        onSelect={() => handleSelect('classic')}
      />
    </div>
  )
}

interface PlanCardProps {
  pending: boolean
  onSelect: () => void
}

function ProPlanCard({ pending, onSelect }: PlanCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#1A4D38] via-[#287253] to-[#F8FAF9] p-6 md:p-8 shadow-[0_20px_60px_rgba(26,77,56,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <h2 className={`${serifTitle} text-[32px] md:text-[38px] leading-none text-white`}>
          Ramply Pro
        </h2>
        <span className="shrink-0 rounded-full bg-[#F4D35E] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#1A4D38]">
          Best Value
        </span>
      </div>

      <div className="mt-6 flex items-end gap-2 text-white">
        <span className={`${serifTitle} text-[56px] md:text-[64px] leading-none text-[#F4D35E]`}>
          $45
        </span>
        <span className="pb-2 text-[18px] font-medium">/mo</span>
      </div>
      <p className="mt-1 text-[14px] text-white/80">plus taxes</p>

      <div className="mt-5 flex items-center gap-2 text-[#F4D35E]">
        <ThumbsUp className="h-5 w-5 shrink-0" />
        <span className="text-[15px] font-semibold">Unlimited requests — no monthly cap</span>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-white/90">
        Built for teams sending onboarding requests at scale. No limits, no slowdowns.
      </p>

      <ul className="mt-6 space-y-3">
        {proFeatures.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-[15px] text-white">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F4D35E]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onSelect}
          disabled={pending}
          className="rounded-full bg-white px-8 py-3 text-[15px] font-semibold text-[#1A4D38] transition-colors hover:bg-[#F0EFE9] disabled:opacity-70"
        >
          {pending ? 'Redirecting…' : 'Select'}
        </button>
      </div>
    </article>
  )
}

function ClassicPlanCard({ pending, onSelect }: PlanCardProps) {
  return (
    <article className="rounded-[28px] border border-[#DDDCD5] bg-white p-6 md:p-8 shadow-[0_12px_40px_rgba(15,31,24,0.06)]">
      <h2 className={`${serifTitle} text-[32px] md:text-[38px] leading-none text-[#0F1F18]`}>
        Classic
      </h2>

      <div className="mt-6 flex items-end gap-2">
        <span className={`${serifTitle} text-[56px] md:text-[64px] leading-none text-[#287253]`}>
          $18
        </span>
        <span className="pb-2 text-[18px] font-medium text-[#4A5C54]">/mo</span>
      </div>
      <p className="mt-1 text-[14px] text-[#7A8C84]">plus taxes</p>

      <div className="mt-5 flex items-center gap-2 text-[#287253]">
        <ThumbsUp className="h-5 w-5 shrink-0" />
        <span className="text-[15px] font-semibold">Up to 20 share requests a month</span>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-[#4A5C54]">
        Everything you need after your 3 free requests. Perfect for growing vendor programs.
      </p>

      <ul className="mt-6 space-y-3">
        {classicFeatures.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-[15px] text-[#4A5C54]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#287253]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onSelect}
          disabled={pending}
          className="rounded-full bg-[#287253] px-8 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A4D38] disabled:opacity-70"
        >
          {pending ? 'Redirecting…' : 'Select'}
        </button>
      </div>
    </article>
  )
}
