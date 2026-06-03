'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'
import {
  buildAuthConfirmPath,
  getAuthCallbackParamsFromLocation,
  hasAuthCallbackParams,
} from '@/lib/auth/parse-auth-callback-params'

const serifTitle = "font-['Instrument_Serif',serif] tracking-tight"
const sansBody = "font-['DM_Sans',sans-serif]"

const onboardingItems = [
  'W-9 tax form',
  'Certificate of insurance',
  'Articles of incorporation',
  'Banking and payment details',
]

const stackedCards = [
  {
    eyebrow: 'Certificate of Insurance',
    title: 'General Liability',
    width: 'w-[280px]',
    position: 'md:top-2 md:right-32',
    rotation: 'md:rotate-[-6deg]',
    progress: 'w-[62%]',
    opacity: 'md:opacity-75',
  },
  {
    eyebrow: 'Tax Document',
    title: 'W-9 Form',
    width: 'w-[258px]',
    position: 'md:top-24 md:right-3',
    rotation: 'md:rotate-[4deg]',
    progress: 'w-[80%]',
    opacity: 'md:opacity-[0.88]',
  },
]

/**
 * Ramply marketing landing page. Preserves the April 2026 green visual style
 * while restoring the stronger desktop composition on the right side.
 */
export default function Landing() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    const params = getAuthCallbackParamsFromLocation()

    if (hasAuthCallbackParams(params)) {
      router.replace(buildAuthConfirmPath(params))
      return
    }

    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  return (
    <div className={`${sansBody} min-h-screen bg-[#F0EFE9] text-[#0F1F18]`}>
      <RamplyNav onLoginClick={() => router.push('/login')} />
      <Hero
        onPrimaryClick={() => router.push('/signup')}
        onSecondaryClick={() => router.push('/signup')}
      />
      <StatsBar />
    </div>
  )
}

interface NavProps {
  onLoginClick: () => void
}

/** Renders the landing-page nav with the simplified Ramply wordmark. */
function RamplyNav({ onLoginClick }: NavProps) {
  return (
    <header className="bg-[#F0EFE9] border-b border-[#DDDCD5]">
      <div className="h-16 flex items-center justify-between px-6 md:px-12">
        <span className="text-[20px] md:text-[24px] font-semibold text-[#0F1F18]">
          Ramply
        </span>
        <button
          type="button"
          onClick={onLoginClick}
          className="text-[14px] md:text-[15px] text-[#4A5C54] hover:text-[#0F1F18] px-3 py-1.5 rounded-lg"
        >
          Log in
        </button>
      </div>
    </header>
  )
}

interface HeroProps {
  onPrimaryClick: () => void
  onSecondaryClick: () => void
}

/** Renders the hero copy, CTA block, and document-preview composition. */
function Hero({ onPrimaryClick, onSecondaryClick }: HeroProps) {
  return (
    <section className="bg-[#F0EFE9]">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-18 md:py-24 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,560px)_1fr] gap-12 lg:gap-8 items-center">
          <div>
            <p className="text-[12px] md:text-[13px] font-medium tracking-[0.24em] uppercase text-[#287253]">
              Vendor Onboarding, Solved
            </p>

            <h1
              className={`${serifTitle} mt-5 text-[48px] md:text-[68px] lg:text-[78px] leading-[0.98] text-[#0F1F18]`}
            >
              One profile.
              <br />
              Every partner.
              <br />
              Zero forms.
            </h1>

            <p className="mt-7 text-[18px] md:text-[21px] leading-[1.6] text-[#4A5C54] max-w-[560px]">
              Ramply replaces the endless cycle of vendor onboarding forms with a
              single, secure profile you share in one click. Your W-9s,
              certificates, and company data, always ready.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onPrimaryClick}
                className="bg-[#287253] hover:bg-[#1A4D38] transition-colors text-white rounded-xl px-8 py-4 text-[16px] md:text-[18px] font-medium disabled:opacity-70"
              >
                Get started free
              </button>
              <button
                type="button"
                onClick={onSecondaryClick}
                className="bg-transparent border border-[#DDDCD5] hover:border-[#287253] transition-colors rounded-xl px-7 py-4 text-[16px] md:text-[18px] text-[#4A5C54] hover:text-[#0F1F18]"
              >
                See how it works {'->'}
              </button>
            </div>

            <p className="mt-7 text-[13px] md:text-[15px] text-[#7A8C84]">
              No credit card required
            </p>
          </div>

          <HeroIllustration />
        </div>
      </div>
    </section>
  )
}

/** Builds the fuller desktop document scene with the onboarding example card. */
function HeroIllustration() {
  return (
    <div className="relative h-[460px] md:h-[560px] lg:h-[620px] flex items-center justify-center lg:justify-end">
      <div className="w-full max-w-[660px] h-full relative">
        <div className="relative md:absolute md:left-0 md:top-24 w-[320px] rounded-[24px] border border-[#DAD8CF] bg-white p-6 shadow-[0_18px_60px_rgba(15,31,24,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#287253]">
                Shared via Ramply
              </p>
              <h3 className="mt-3 text-[27px] leading-tight font-medium text-[#0F1F18]">
                Standard Vendor
                <br />
                Onboarding
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-[#7A8C84]">
                Example packet sent to every new partner.
              </p>
            </div>
            <button
              type="button"
              aria-label="More options"
              className="h-9 w-9 rounded-full border border-[#E5E2D9] text-[#8A978F] text-lg leading-none"
            >
              ...
            </button>
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#9AA7A0]">
              Required Documents
            </p>
            <div className="mt-4 space-y-3">
              {onboardingItems.map((item) => (
                <div key={item} className="flex items-center gap-3 text-[15px] text-[#4A5C54]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#287253]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 flex items-center gap-2 text-[15px] font-medium text-[#287253]">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#287253] text-white">
              <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
                <path
                  d="M4 8.5l2.5 2.5L12 5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>Verified and ready to share</span>
          </div>
        </div>

        {stackedCards.map((card) => (
          <div
            key={card.title}
            className={`mt-4 md:mt-0 md:absolute ${card.position} ${card.width} ${card.rotation} ${card.opacity} rounded-[22px] bg-white border border-[#DDDCD5] shadow-sm p-5`}
          >
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#8A978F]">
              {card.eyebrow}
            </p>
            <p className="mt-3 text-[17px] font-medium text-[#0F1F18]">{card.title}</p>
            <div className="mt-4 h-1.5 w-full bg-[#E8F2ED] rounded-full">
              <div className={`h-1.5 ${card.progress} bg-[#287253] rounded-full`} />
            </div>
          </div>
        ))}

        <div
          className="mt-4 md:mt-0 md:absolute md:top-64 md:right-18 w-[296px] bg-white rounded-[22px] shadow-[0_12px_32px_rgba(40,114,83,0.12)] p-5"
          style={{ border: '1.5px solid #287253' }}
        >
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#287253]">
            Shared via Ramply
          </p>
          <p className="mt-3 text-[18px] font-medium text-[#0F1F18]">Company Profile</p>
          <div className="mt-4 h-1.5 w-full bg-[#E8F2ED] rounded-full">
            <div className="h-1.5 w-[72%] bg-[#287253] rounded-full" />
          </div>
          <div className="mt-5 flex items-center gap-2 text-[14px] text-[#287253]">
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[#287253]">
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-white" aria-hidden>
                <path
                  d="M4 8.5l2.5 2.5L12 5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>Verified and shared</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Renders the lower stats bar with slightly larger desktop typography. */
function StatsBar() {
  return (
    <section className="bg-white border-t border-[#DDDCD5]">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-14 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-10">
          <Stat number="73%" label="of vendor onboarding is still done via email" dividerRight />
          <Stat number="14 hrs" label="average time to onboard a single vendor" dividerRight />
          <Stat number="$2.5B+" label="vendor onboarding software market in 2026" />
        </div>
      </div>
    </section>
  )
}

interface StatProps {
  number: string
  label: string
  dividerRight?: boolean
}

/** Displays one stat tile in the footer metrics row. */
function Stat({ number, label, dividerRight }: StatProps) {
  return (
    <div className={`text-center px-6 ${dividerRight ? 'md:border-r md:border-[#DDDCD5]' : ''}`}>
      <p className={`${serifTitle} text-[52px] md:text-[60px] leading-none text-[#287253]`}>
        {number}
      </p>
      <p className="mt-3 text-[15px] md:text-[16px] leading-relaxed text-[#7A8C84] max-w-[280px] mx-auto">
        {label}
      </p>
    </div>
  )
}
