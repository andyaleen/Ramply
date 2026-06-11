import { DM_Sans } from 'next/font/google'

/** Primary UI typeface — loaded globally for the app shell and dashboard. */
export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-dm-sans',
})
