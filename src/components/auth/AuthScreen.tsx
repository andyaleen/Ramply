'use client'

import { useRouter } from 'next/navigation'

const serifTitle = "font-['Instrument_Serif',serif] tracking-tight"
const sansBody = "font-['DM_Sans',sans-serif]"

interface AuthScreenProps {
  children: React.ReactNode
}

/**
 * Shared auth shell that matches the current Ramply marketing look and feel.
 */
export function AuthScreen({ children }: AuthScreenProps) {
  const router = useRouter()

  return (
    <div className={`${sansBody} min-h-screen bg-[#F0EFE9] text-[#0F1F18]`}>
      <header className="border-b border-[#DDDCD5] bg-[#F0EFE9]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 md:px-12">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-[18px] font-semibold text-[#0F1F18]"
          >
            Ramply<span className="text-[#287253]">OS</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-lg px-3 py-1.5 text-sm text-[#4A5C54] transition-colors hover:text-[#0F1F18]"
          >
            Back to home
          </button>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-56px)] max-w-7xl grid-cols-1 gap-12 px-6 py-12 md:px-12 lg:grid-cols-[1.1fr_560px] lg:items-center">
        <section className="max-w-[520px]">
          <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#287253]">
            Secure Access
          </p>
          <h1 className={`${serifTitle} mt-5 text-[42px] leading-[1.05] text-[#0F1F18] md:text-[60px]`}>
            Step back into Ramply without stepping back into paperwork.
          </h1>
          <p className="mt-6 max-w-[440px] text-[16px] leading-relaxed text-[#4A5C54]">
            Sign in to reuse your verified company profile, share documents in one click,
            and keep onboarding requests moving without the usual email chase.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <FeaturePill
              stat="1 profile"
              label="Reuse company details across every request."
            />
            <FeaturePill
              stat="Fast re-share"
              label="Send verified documents without re-uploading."
            />
            <FeaturePill
              stat="Secure by default"
              label="Re-authentication kicks in after inactivity."
            />
          </div>
        </section>

        <section>{children}</section>
      </main>
    </div>
  )
}

interface FeaturePillProps {
  stat: string
  label: string
}

function FeaturePill({ stat, label }: FeaturePillProps) {
  return (
    <div className="rounded-2xl border border-[#DDDCD5] bg-white/80 p-4 shadow-[0_12px_40px_rgba(15,31,24,0.06)] backdrop-blur">
      <p className="text-sm font-semibold text-[#0F1F18]">{stat}</p>
      <p className="mt-2 text-sm leading-relaxed text-[#6B7B74]">{label}</p>
    </div>
  )
}
