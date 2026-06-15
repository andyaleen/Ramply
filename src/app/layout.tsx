import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { dmSans } from '@/lib/fonts/dm-sans'
import { getMetadataBase } from '@/lib/site-url'

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: 'Ramply - Streamline Your Onboarding Process',
  description:
    'Simplify vendor and customer onboarding with one-click links and reusable information',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
