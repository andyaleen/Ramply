import type { Metadata } from 'next'

import { instrumentSerif } from '@/lib/fonts/instrument-serif'
import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = canonicalMetadata('/')

/** Loads Instrument Serif only for public marketing routes (/ , /about, /pricing, /privacy, /terms, /contact). */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={instrumentSerif.variable}>{children}</div>
}
