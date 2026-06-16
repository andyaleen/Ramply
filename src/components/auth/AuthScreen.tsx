'use client'

import { useRouter } from 'next/navigation'

const displayTitle = 'font-semibold tracking-tight'

interface AuthScreenProps {
  children: React.ReactNode
  headline?: string
  subheadline?: string
  /** When set, replaces the subheadline and default feature pills with these cards. */
  highlights?: string[]
}

const DEFAULT_HEADLINE = 'Step back into Ramply without stepping back into paperwork.'
const DEFAULT_SUBHEADLINE =
  'Sign in to reuse your verified company profile, share documents in one click, and keep onboarding requests moving without the usual email chase.'
const DEFAULT_HIGHLIGHTS = [
  'Reuse company details across every request.',
  'Send verified documents without re-uploading.',
]
const DEFAULT_HIGHLIGHT_STATS = ['1 profile', 'Fast re-share']

/**
 * Shared auth shell that matches the current Ramply marketing look and feel.
 */
export function AuthScreen({
  children,
  headline = DEFAULT_HEADLINE,
  subheadline = DEFAULT_SUBHEADLINE,
  highlights,
}: AuthScreenProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F0EFE9] text-[#0F1F18]">
      <header className="border-b border-[#DDDCD5] bg-[#F0EFE9]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 md:px-12">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-[18px] font-semibold text-[#0F1F18]"
          >
            Ramply
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

      <main className="mx-auto grid min-h-[calc(100vh-56px)] max-w-7xl grid-cols-1 gap-12 px-6 py-12 md:px-12 lg:grid-cols-[1.1fr_560px] lg:items-start">
        <section className="max-w-[520px]">
          <h1 className={`${displayTitle} text-[42px] leading-[1.05] text-[#0F1F18] md:text-[60px]`}>
            {headline}
          </h1>
          {!highlights && (
            <p className="mt-6 max-w-[440px] text-[16px] leading-relaxed text-[#4A5C54]">
              {subheadline}
            </p>
          )}

          <div className={`mt-10 grid gap-4 ${highlights ? '' : 'sm:grid-cols-2'}`}>
            {highlights
              ? highlights.map((text) => <FeaturePill key={text} text={text} />)
              : DEFAULT_HIGHLIGHT_STATS.map((stat, index) => (
                  <FeaturePill key={stat} stat={stat} label={DEFAULT_HIGHLIGHTS[index]!} />
                ))}
          </div>
        </section>

        <section>{children}</section>
      </main>
    </div>
  )
}

interface FeaturePillProps {
  stat?: string
  label?: string
  text?: string
}

function FeaturePill({ stat, label, text }: FeaturePillProps) {
  return (
    <div className="rounded-2xl border border-[#DDDCD5] bg-white/80 p-4 shadow-[0_12px_40px_rgba(15,31,24,0.06)] backdrop-blur">
      {text ? (
        <p className="text-sm leading-relaxed text-[#0F1F18]">{text}</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#0F1F18]">{stat}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#6B7B74]">{label}</p>
        </>
      )}
    </div>
  )
}
