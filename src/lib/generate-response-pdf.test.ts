import { describe, expect, test } from 'vitest'

import { generateResponsePdf } from './generate-response-pdf'
import type { ResponseDetailViewModel } from './response-detail-view-model'

const sampleViewModel: ResponseDetailViewModel = {
  requestType: 'Vendor Onboarding',
  status: 'completed',
  companyName: 'Acme Supplies LLC',
  recipientEmail: 'vendor@example.com',
  responseDate: 'Feb 1, 2026',
  requiredFields: [{ key: 'legal_name', label: 'Legal Business Name', value: 'Acme Supplies LLC' }],
  optionalFields: [],
  documents: [
    {
      docType: 'W9',
      label: 'W-9',
      required: true,
      fileName: 'w9.pdf',
      uploadedAt: 'Feb 1, 2026',
      status: 'provided',
    },
  ],
}

describe('generateResponsePdf', () => {
  test('returns a non-empty PDF buffer', async () => {
    const buffer = await generateResponsePdf(sampleViewModel, {
      requesterCompanyName: 'Ramply Customer Inc',
      logoBuffer: null,
      logoMimeType: null,
    })

    expect(buffer.byteLength).toBeGreaterThan(500)
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF')
  })

  test('does not append a trailing blank page for a typical response', async () => {
    const buffer = await generateResponsePdf(sampleViewModel, {
      requesterCompanyName: 'Ramply Customer Inc',
      logoBuffer: null,
      logoMimeType: null,
    })

    const pageCount = (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
    expect(pageCount).toBe(1)
  })

  test('does not append a trailing blank page for long multi-page responses', async () => {
    const longViewModel: ResponseDetailViewModel = {
      ...sampleViewModel,
      requiredFields: Array.from({ length: 24 }, (_, index) => ({
        key: `field_${index}`,
        label: `Required Field ${index + 1}`,
        value: `Value ${index + 1} with enough text to wrap onto additional lines when needed`,
      })),
      documents: Array.from({ length: 8 }, (_, index) => ({
        docType: `DOC_${index}`,
        label: `Document ${index + 1}`,
        required: true,
        fileName: `document-${index + 1}.pdf`,
        uploadedAt: 'Feb 1, 2026',
        status: 'provided' as const,
      })),
    }

    const buffer = await generateResponsePdf(longViewModel, {
      requesterCompanyName: 'Ramply Customer Inc',
      logoBuffer: null,
      logoMimeType: null,
    })

    const pageCount = (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
    expect(pageCount).toBeGreaterThan(1)
    expect(pageCount).toBeLessThanOrEqual(3)
  })
})
