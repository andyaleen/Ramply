import type { Metadata } from 'next'

import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'About | Ramply',
  description:
    'Learn how Ramply replaces repetitive vendor onboarding with one verified company profile you share in a click.',
  ...canonicalMetadata('/about'),
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
