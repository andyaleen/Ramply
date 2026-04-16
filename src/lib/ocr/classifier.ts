import Anthropic from '@anthropic-ai/sdk'
import { CATALOG_DOCUMENT_TYPES, type DocumentTypeKey } from '@/lib/catalog'

const VALID_TYPES = CATALOG_DOCUMENT_TYPES.map(d => d.key) as DocumentTypeKey[]

const TYPE_DESCRIPTIONS: Record<DocumentTypeKey, string> = {
  W9:                        'IRS W-9 form (Request for Taxpayer Identification Number and Certification)',
  liability_insurance:       'Certificate of Liability Insurance (ACORD 25 or similar)',
  resale_cert:               'Resale Certificate or Sales Tax Exemption Certificate',
  bank_reference:            'Bank Reference Letter from a financial institution',
  insurance_cert:            'General Certificate of Insurance (non-liability)',
  articles_of_incorporation: 'Articles of Incorporation or Certificate of Formation',
  business_license:          'Business License or business registration permit',
  voided_check:              'Voided check showing routing and account numbers',
}

/**
 * Uses Claude to classify the document type from raw OCR text.
 * Returns the detected DocumentTypeKey, or null if classification fails or
 * ANTHROPIC_API_KEY is not configured.
 *
 * This is intentionally lightweight — only the first ~2000 chars of text are
 * sent since document headers are the most diagnostic signal.
 */
export async function classifyDocument(rawText: string): Promise<DocumentTypeKey | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const client = new Anthropic()
  const excerpt = rawText.slice(0, 2000).trim()

  const typeList = VALID_TYPES.map(
    key => `- ${key}: ${TYPE_DESCRIPTIONS[key]}`
  ).join('\n')

  const prompt = `You are classifying a business document from its OCR text.

Valid document types:
${typeList}

Respond with ONLY the exact key (e.g. "W9" or "liability_insurance"). If none match, respond with "unknown".

Document text:
${excerpt}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : ''

    if ((VALID_TYPES as string[]).includes(raw)) {
      return raw as DocumentTypeKey
    }

    return null
  } catch (err) {
    console.error('Document classification failed:', err)
    return null
  }
}
