'use client'

import { useRouter } from 'next/navigation'

import { ContactForm } from '@/components/marketing/ContactForm'
import { RamplyMarketingFooter } from '@/components/marketing/RamplyMarketingFooter'
import { RamplyMarketingNav } from '@/components/marketing/RamplyMarketingNav'
import { serifTitle } from '@/components/marketing/marketing-styles'

/** Public contact page at /contact. */
export default function ContactPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F0EFE9] text-[#0F1F18] flex flex-col">
      <RamplyMarketingNav onLoginClick={() => router.push('/login')} />

      <main className="flex-1 px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-[640px] mx-auto">
          <p className="text-[12px] md:text-[13px] font-medium tracking-[0.24em] uppercase text-[#287253]">
            Get in touch
          </p>
          <h1 className={`${serifTitle} mt-4 text-[40px] md:text-[52px] leading-[1.05] text-[#0F1F18]`}>
            Contact Ramply
          </h1>
          <p className="mt-4 text-[16px] md:text-[18px] leading-relaxed text-[#4A5C54]">
            Questions about onboarding, pricing, or your account? Send us a message and we will reply by email.
          </p>

          <div className="mt-10 rounded-[24px] border border-[#DDDCD5] bg-white p-6 md:p-8 shadow-[0_18px_60px_rgba(15,31,24,0.06)]">
            <ContactForm />
          </div>
        </div>
      </main>

      <RamplyMarketingFooter />
    </div>
  )
}
