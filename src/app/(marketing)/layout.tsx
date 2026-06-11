import { instrumentSerif } from '@/lib/fonts/instrument-serif'

/** Loads Instrument Serif only for public marketing routes (/ , /pricing). */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={instrumentSerif.variable}>{children}</div>
}
