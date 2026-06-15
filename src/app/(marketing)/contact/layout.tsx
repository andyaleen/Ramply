import type { Metadata } from 'next'

import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Contact | Ramply',
  description:
    'Questions about onboarding, pricing, or your account? Contact the Ramply team by email.',
  ...canonicalMetadata('/contact'),
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
