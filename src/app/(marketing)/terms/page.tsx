import type { Metadata } from 'next'

import { LegalDocumentPage } from '@/components/marketing/LegalDocumentPage'
import { TERMS_OF_SERVICE_SECTIONS } from '@/lib/legal/terms-of-service'
import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Terms of Service | Ramply',
  description:
    'Read the terms that govern your use of Ramply, our vendor onboarding platform.',
  ...canonicalMetadata('/terms'),
}

/** Public terms of service at /terms. */
export default function TermsOfServicePage() {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      sections={TERMS_OF_SERVICE_SECTIONS}
      relatedHref="/privacy"
      relatedLabel="Privacy Policy"
    />
  )
}
