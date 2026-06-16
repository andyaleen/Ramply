'use client'

import { useRouter } from 'next/navigation'

import { RamplyMarketingFooter } from '@/components/marketing/RamplyMarketingFooter'
import { RamplyMarketingNav } from '@/components/marketing/RamplyMarketingNav'
import { serifTitle } from '@/components/marketing/marketing-styles'

const steps = [
  {
    number: '01',
    title: 'Build your profile once',
    description:
      'Enter company details and upload standard documents like W-9s, certificates of insurance, and banking info into a secure vault.',
  },
  {
    number: '02',
    title: 'Receive a share request',
    description:
      'When a partner needs your information, they send a request to your email. You sign in and see exactly what they need — already mapped to your saved profile.',
  },
  {
    number: '03',
    title: 'Review and share in one click',
    description:
      'Confirm your details, consent to share, and send. No re-typing, no digging through inboxes, no duplicate uploads for every new partner.',
  },
]

const valueProps = [
  {
    title: 'Verify once, share everywhere',
    description:
      'Every onboarding asks for the same documents. Ramply stores them once so you stop uploading the same W-9 for the tenth time.',
  },
  {
    title: 'Standardized, not custom forms',
    description:
      'Ramply uses a fixed catalog of fields and document types. Sharing is a direct lookup from your profile — not a new form every time.',
  },
  {
    title: 'Less email back-and-forth',
    description:
      'Requesters get structured data and documents immediately. Recipients close requests without chasing threads or resending attachments.',
  },
  {
    title: 'Secure by design',
    description:
      'You control what gets shared and when. Partners receive verified company information through Ramply instead of scattered email attachments.',
  },
]

/** Public about page at /about — explains Ramply's value proposition. */
export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F0EFE9] text-[#0F1F18] flex flex-col">
      <RamplyMarketingNav onLoginClick={() => router.push('/login')} />

      <main className="flex-1">
        <section className="px-6 md:px-12 py-12 md:py-20">
          <div className="max-w-[760px] mx-auto">
            <p className="text-[12px] md:text-[13px] font-medium tracking-[0.24em] uppercase text-[#287253]">
              How Ramply works
            </p>
            <h1
              className={`${serifTitle} mt-4 text-[40px] md:text-[56px] leading-[1.02] text-[#0F1F18]`}
            >
              One profile replaces the onboarding loop
            </h1>
            <p className="mt-5 text-[17px] md:text-[19px] leading-relaxed text-[#4A5C54]">
              Ramply is a one-click business document sharing platform. Companies store their profile
              and compliance documents once, then share them instantly when a trading partner
              requests them — no re-typing, no re-scanning, no email threads.
            </p>
          </div>
        </section>

        <section className="px-6 md:px-12 pb-12 md:pb-16">
          <div className="max-w-[980px] mx-auto rounded-[28px] border border-[#DDDCD5] bg-white p-6 md:p-10 shadow-[0_18px_60px_rgba(15,31,24,0.06)]">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#287253]">
              The problem
            </p>
            <h2 className={`${serifTitle} mt-3 text-[28px] md:text-[34px] leading-tight text-[#0F1F18]`}>
              Every partner asks for the same information
            </h2>
            <p className="mt-4 text-[16px] md:text-[17px] leading-relaxed text-[#4A5C54] max-w-[720px]">
              Vendor onboarding usually means the same W-9, insurance certificate, and company
              details sent over and over — often through long email chains with missing attachments
              and outdated files. Ramply standardizes that information so sharing becomes a direct
              handoff, not a repeat project.
            </p>
          </div>
        </section>

        <section className="px-6 md:px-12 pb-12 md:pb-16">
          <div className="max-w-[980px] mx-auto">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#287253]">
              Three steps
            </p>
            <h2 className={`${serifTitle} mt-3 text-[28px] md:text-[34px] leading-tight text-[#0F1F18]`}>
              From request to shared packet
            </h2>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="rounded-[22px] border border-[#DDDCD5] bg-white p-6 shadow-[0_12px_40px_rgba(15,31,24,0.05)]"
                >
                  <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#287253]">
                    Step {step.number}
                  </p>
                  <h3 className="mt-3 text-[20px] font-medium text-[#0F1F18]">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#4A5C54]">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 pb-16 md:pb-24">
          <div className="max-w-[980px] mx-auto">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#287253]">
              Why teams use Ramply
            </p>
            <h2 className={`${serifTitle} mt-3 text-[28px] md:text-[34px] leading-tight text-[#0F1F18]`}>
              Built for both sides of onboarding
            </h2>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {valueProps.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[22px] border border-[#DDDCD5] bg-white/80 p-6"
                >
                  <h3 className="text-[18px] font-medium text-[#0F1F18]">{item.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#4A5C54]">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-12 rounded-[24px] border border-[#287253] bg-[#E8F2ED] p-8 md:p-10 text-center">
              <h2 className={`${serifTitle} text-[28px] md:text-[34px] leading-tight text-[#0F1F18]`}>
                Ready to stop repeating onboarding?
              </h2>
              <p className="mt-4 text-[16px] md:text-[17px] leading-relaxed text-[#4A5C54] max-w-[560px] mx-auto">
                Create your company profile, upload your documents once, and share them with every
                new partner in one click.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/signup')}
                  className="bg-[#287253] hover:bg-[#1A4D38] transition-colors text-white rounded-xl px-8 py-4 text-[16px] font-medium"
                >
                  Get started free
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/pricing')}
                  className="bg-transparent border border-[#DDDCD5] hover:border-[#287253] transition-colors rounded-xl px-7 py-4 text-[16px] text-[#4A5C54] hover:text-[#0F1F18]"
                >
                  View pricing
                </button>
              </div>
              <p className="mt-5 text-[13px] text-[#7A8C84]">No credit card required</p>
            </div>
          </div>
        </section>
      </main>

      <RamplyMarketingFooter />
    </div>
  )
}
