'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { startGoogleAuth } from '@/lib/auth/startGoogleAuth'

const serifTitle = "font-['Instrument_Serif',serif] tracking-tight"
const sansBody = "font-['DM_Sans',sans-serif]"

/**
 * Ramply marketing landing page. Follows the April 2026 design spec:
 * warm-gray hero with a two-column layout (left: pitch + CTAs, right:
 * stacked floating cards), plus a white stats bar below.
 */
export default function Landing() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [startingGoogleAuth, setStartingGoogleAuth] = useState(false)
  const [googleAuthError, setGoogleAuthError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authCode = params.get('code')

    if (authCode) {
      const callbackParams = new URLSearchParams(params.toString())
      if (!callbackParams.get('next')) {
        callbackParams.set('next', '/dashboard')
      }
      router.replace(`/auth/callback?${callbackParams.toString()}`)
      return
    }

    if (!loading && user) {
      router.replace('/post-login?next=/dashboard')
    }
  }, [user, loading, router])

  /** Starts Google OAuth and handles the primary hero CTA. */
  const handleGetStarted = async () => {
    setStartingGoogleAuth(true)
    setGoogleAuthError('')

    const error = await startGoogleAuth('/dashboard')
    if (error) {
      setGoogleAuthError(error)
      setStartingGoogleAuth(false)
    }
  }

  return (
    <div className={`${sansBody} min-h-screen bg-[#F0EFE9] text-[#0F1F18]`}>
      <RamplyNav onLoginClick={() => router.push('/login')} />
      <Hero
        onPrimaryClick={handleGetStarted}
        onSecondaryClick={() => router.push('/signup')}
        busy={startingGoogleAuth}
        error={googleAuthError}
      />
      <StatsBar />
    </div>
  )
}

interface NavProps {
  onLoginClick: () => void
}

/**
 * Top navigation bar. Matches the hero's warm-gray background with a 1px
 * bottom border; keeps the brand mark + "Powered by Polsia" pill and a
 * single Log in affordance on the right.
 */
function RamplyNav({ onLoginClick }: NavProps) {
  return (
    <header className="bg-[#F0EFE9] border-b border-[#DDDCD5]">
      <div className="h-14 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-semibold text-[#0F1F18]">
            Ramply<span className="text-[#287253]">OS</span>
          </span>
          <span className="hidden sm:inline-flex items-center bg-white border border-[#DDDCD5] rounded-full px-3 py-1 text-xs text-[#7A8C84]">
            Powered by Polsia
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoginClick}
            className="text-sm text-[#4A5C54] hover:text-[#0F1F18] px-3 py-1.5 rounded-lg"
          >
            Log in
          </button>
        </div>
      </div>
    </header>
  )
}

interface HeroProps {
  onPrimaryClick: () => void
  onSecondaryClick: () => void
  busy: boolean
  error: string
}

/**
 * Two-column hero. Left column carries the eyebrow, headline, body, and
 * CTA row; right column renders the stacked document "deck".
 */
function Hero({ onPrimaryClick, onSecondaryClick, busy, error }: HeroProps) {
  return (
    <section className="bg-[#F0EFE9]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[12px] font-medium tracking-widest uppercase text-[#287253]">
              Vendor Onboarding, Solved
            </p>

            <h1
              className={`${serifTitle} mt-5 text-[44px] md:text-[64px] leading-[1.05] text-[#0F1F18]`}
            >
              One profile.<br />
              Every partner.<br />
              Zero forms.
            </h1>

            <p className="mt-6 text-[16px] font-light leading-relaxed text-[#4A5C54] max-w-[420px]">
              Ramply replaces the endless cycle of vendor onboarding forms with a
              single, secure profile you share in one click. Your W-9s,
              certificates, and company data, always ready.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onPrimaryClick}
                disabled={busy}
                className="bg-[#287253] hover:bg-[#1A4D38] transition-colors text-white rounded-lg px-7 py-3 text-sm font-medium disabled:opacity-70"
              >
                {busy ? 'Connecting…' : 'Get started free'}
              </button>
              <button
                type="button"
                onClick={onSecondaryClick}
                className="bg-transparent border border-[#DDDCD5] hover:border-[#287253] transition-colors rounded-lg px-6 py-3 text-sm text-[#4A5C54] hover:text-[#0F1F18]"
              >
                See how it works →
              </button>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600 max-w-[420px]">{error}</p>
            )}

            <p className="mt-6 text-xs text-[#7A8C84]">No credit card required</p>
          </div>

          <HeroIllustration />
        </div>
      </div>
    </section>
  )
}

/**
 * Three stacked document cards that fan out to the right of the hero copy.
 * Desktop: absolute-positioned stack. Mobile: graceful vertical stack.
 */
function HeroIllustration() {
  return (
    <div className="relative h-[420px] md:h-[460px] flex items-center justify-center lg:justify-end">
      {/* Back card — 75% opacity, slight rotation */}
      <div
        className="hidden md:block absolute top-4 right-28 w-[260px] rotate-[-6deg] opacity-75 bg-white border border-[#DDDCD5] rounded-xl shadow-sm p-5"
      >
        <p className="text-[10px] font-semibold tracking-wider uppercase text-[#7A8C84]">
          Certificate of Insurance
        </p>
        <p className="mt-2 text-[15px] font-medium text-[#0F1F18]">
          General Liability
        </p>
        <div className="mt-4 h-1.5 w-full bg-[#E8F2ED] rounded-full">
          <div className="h-1.5 w-[60%] bg-[#287253] rounded-full" />
        </div>
      </div>

      {/* Mid card — 88% opacity, lighter rotation */}
      <div
        className="hidden md:block absolute top-24 right-4 w-[240px] rotate-[4deg] opacity-[0.88] bg-white border border-[#DDDCD5] rounded-xl shadow-sm p-5"
      >
        <p className="text-[10px] font-semibold tracking-wider uppercase text-[#7A8C84]">
          Tax Document
        </p>
        <p className="mt-2 text-[15px] font-medium text-[#0F1F18]">W-9 Form</p>
        <div className="mt-4 h-1.5 w-full bg-[#E8F2ED] rounded-full">
          <div className="h-1.5 w-[80%] bg-[#287253] rounded-full" />
        </div>
      </div>

      {/* Front card — full opacity, green border, verified row */}
      <div
        className="relative md:absolute md:top-44 md:right-20 w-[260px] bg-white rounded-xl shadow-sm p-5"
        style={{ border: '1.5px solid #287253' }}
      >
        <p className="text-[10px] font-semibold tracking-wider uppercase text-[#287253]">
          Shared via Ramply
        </p>
        <p className="mt-2 text-[15px] font-medium text-[#0F1F18]">
          Company Profile
        </p>
        <div className="mt-4 h-1.5 w-full bg-[#E8F2ED] rounded-full">
          <div className="h-1.5 w-[72%] bg-[#287253] rounded-full" />
        </div>
        <div className="mt-4 flex items-center gap-2 text-[13px] text-[#287253]">
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
  )
}

/**
 * White stats bar — three equal columns with vertical dividers, set off
 * from the hero by a 1px top border and white background.
 */
function StatsBar() {
  return (
    <section className="bg-white border-t border-[#DDDCD5]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-10">
          <Stat
            number="73%"
            label="of vendor onboarding is still done via email"
            dividerRight
          />
          <Stat
            number="14 hrs"
            label="average time to onboard a single vendor"
            dividerRight
          />
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

function Stat({ number, label, dividerRight }: StatProps) {
  return (
    <div
      className={`text-center px-6 ${
        dividerRight ? 'md:border-r md:border-[#DDDCD5]' : ''
      }`}
    >
      <p className={`${serifTitle} text-[52px] leading-none text-[#287253]`}>
        {number}
      </p>
      <p className="mt-3 text-[14px] font-light leading-relaxed text-[#7A8C84] max-w-[260px] mx-auto">
        {label}
      </p>
    </div>
  )
}
