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
})
