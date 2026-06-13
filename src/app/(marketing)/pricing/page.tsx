'use client'

import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'
import { PricingPlanCards } from '@/components/marketing/PricingPlanCards'
import { RamplyMarketingFooter } from '@/components/marketing/RamplyMarketingFooter'
import { RamplyMarketingNav } from '@/components/marketing/RamplyMarketingNav'
import { serifTitle } from '@/components/marketing/marketing-styles'

/** Public pricing page at /pricing. */
export default function PricingPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-[#F0EFE9] text-[#0F1F18]">
      <RamplyMarketingNav onLoginClick={() => router.push('/login')} />

      <main className="px-6 md:px-12 py-14 md:py-20">
        <div className="max-w-[980px] mx-auto text-center">
          <p className="text-[12px] md:text-[13px] font-medium tracking-[0.24em] uppercase text-[#287253]">
            Simple, transparent pricing
          </p>
          <h1 className={`${serifTitle} mt-4 text-[42px] md:text-[56px] leading-[1.02] text-[#0F1F18]`}>
            Select a plan
          </h1>
          <p className="mt-4 text-[17px] md:text-[19px] leading-relaxed text-[#4A5C54] max-w-[640px] mx-auto">
            Start with 3 free share requests. Subscribe when you are ready to keep onboarding partners without limits.
          </p>
        </div>

        <div className="mt-12 md:mt-16">
          <PricingPlanCards isAuthenticated={!loading && !!user} />
        </div>

        <p className="mt-10 text-center text-[14px] text-[#7A8C84] max-w-[560px] mx-auto">
          Every account includes 3 free share requests. Classic includes up to 20 requests per month.
          Ramply Pro removes the monthly cap entirely.
        </p>
      </main>

      <RamplyMarketingFooter />
    </div>
  )
}
