import type { Metadata } from 'next'

import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Pricing | Ramply',
  description:
    'Simple, transparent pricing for vendor onboarding. Start with free share requests and upgrade when you are ready.',
  ...canonicalMetadata('/pricing'),
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
