import type { Metadata } from 'next'

import { LegalDocumentPage } from '@/components/marketing/LegalDocumentPage'
import { PRIVACY_POLICY_SECTIONS } from '@/lib/legal/privacy-policy'

export const metadata: Metadata = {
  title: 'Privacy Policy | Ramply',
  description:
    'Learn how Ramply collects, uses, and protects your information when you use our vendor onboarding platform.',
}

/** Public privacy policy at /privacy. */
export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      sections={PRIVACY_POLICY_SECTIONS}
      relatedHref="/terms"
      relatedLabel="Terms of Service"
    />
  )
}
