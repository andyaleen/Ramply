import { Instrument_Serif } from 'next/font/google'

/** Display serif for marketing pages only (landing, pricing). */
export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-instrument-serif',
})
