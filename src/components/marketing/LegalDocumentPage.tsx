'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { RamplyMarketingNav } from '@/components/marketing/RamplyMarketingNav'
import { RamplyMarketingFooter } from '@/components/marketing/RamplyMarketingFooter'
import { serifTitle } from '@/components/marketing/marketing-styles'
import type { LegalSection } from '@/lib/legal/site'
import { LEGAL_SITE } from '@/lib/legal/site'

interface LegalDocumentPageProps {
  title: string
  sections: LegalSection[]
  relatedHref: '/privacy' | '/terms'
  relatedLabel: string
}

/**
 * Shared layout for public legal documents (/privacy, /terms).
 */
export function LegalDocumentPage({
  title,
  sections,
  relatedHref,
  relatedLabel,
}: LegalDocumentPageProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F0EFE9] text-[#0F1F18] flex flex-col">
      <RamplyMarketingNav onLoginClick={() => router.push('/login')} />

      <main className="flex-1 px-6 md:px-12 py-12 md:py-16">
        <article className="max-w-[760px] mx-auto">
          <p className="text-[12px] md:text-[13px] font-medium tracking-[0.24em] uppercase text-[#287253]">
            Legal
          </p>
          <h1 className={`${serifTitle} mt-4 text-[40px] md:text-[52px] leading-[1.05] text-[#0F1F18]`}>
            {title}
          </h1>
          <p className="mt-4 text-[15px] text-[#7A8C84]">
            Effective date: {LEGAL_SITE.effectiveDate}
          </p>
          <p className="mt-2 text-[15px] text-[#4A5C54]">
            See also{' '}
            <Link href={relatedHref} className="text-[#287253] hover:text-[#1A4D38] underline underline-offset-2">
              {relatedLabel}
            </Link>
            .
          </p>

          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-[22px] md:text-[24px] font-semibold text-[#0F1F18]">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-[16px] leading-[1.7] text-[#4A5C54]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets && section.bullets.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-6">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>

      <RamplyMarketingFooter />
    </div>
  )
}
