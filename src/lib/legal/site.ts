/** Shared legal page metadata for Ramply public policies. */
export const LEGAL_SITE = {
  companyName: 'Ramply LLC',
  productName: 'Ramply',
  websiteUrl: 'https://www.ramply.org',
  contactEmail: 'info@ramply.org',
  effectiveDate: 'June 12, 2026',
} as const

export type LegalSection = {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
}
