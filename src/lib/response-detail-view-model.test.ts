import { describe, expect, test } from 'vitest'

import { buildResponseDetailViewModel, responsePdfFileName } from './response-detail-view-model'

describe('buildResponseDetailViewModel', () => {
  test('maps submitted fields and documents into a summary view model', () => {
    const viewModel = buildResponseDetailViewModel({
      id: 'req-1',
      requester_company_id: 'company-1',
      request_type: 'Vendor Onboarding',
      recipient_email: 'vendor@example.com',
      mandatory_fields: ['legal_name'],
      mandatory_documents: ['W9'],
      optional_fields: ['website'],
      optional_documents: ['COI'],
      expires_at: '2026-01-01T00:00:00.000Z',
      status: 'completed',
      completed_by_company_id: 'recipient-1',
      completed_at: '2026-02-01T00:00:00.000Z',
      denied_at: null,
      denied_by_company_id: null,
      created_at: '2026-01-15T00:00:00.000Z',
      updated_at: '2026-02-01T00:00:00.000Z',
      sharedData: {
        id: 'shared-1',
        share_request_id: 'req-1',
        company_id: 'recipient-1',
        field_data: {
          legal_name: 'Acme Supplies LLC',
          website: 'https://acme.example',
        },
        created_at: '2026-02-01T00:00:00.000Z',
      },
      sharedDocs: [
        {
          id: 'doc-1',
          company_id: 'recipient-1',
          document_type: 'W9',
          file_path: 'user/doc/W9.pdf',
          file_name: 'w9.pdf',
          file_size: 1000,
          mime_type: 'application/pdf',
          file_hash: 'abc',
          version: 1,
          superseded_by: null,
          uploaded_at: '2026-02-01T00:00:00.000Z',
          extracted_fields: {},
          approved_fields: null,
          approved_at: null,
        },
      ],
      recipientCompany: {
        id: 'recipient-1',
        owner_user_id: 'owner-1',
        legal_name: 'Acme Supplies LLC',
        dba_name: null,
      } as never,
    })

    expect(viewModel.companyName).toBe('Acme Supplies LLC')
    expect(viewModel.requiredFields).toEqual([
      { key: 'legal_name', label: 'Legal Business Name', value: 'Acme Supplies LLC' },
    ])
    expect(viewModel.optionalFields).toEqual([
      { key: 'website', label: 'Website', value: 'https://acme.example' },
    ])
    expect(viewModel.documents).toHaveLength(2)
    expect(viewModel.documents[0]).toMatchObject({
      label: 'W-9 Form',
      status: 'provided',
      fileName: 'w9.pdf',
    })
    expect(viewModel.documents[1]).toMatchObject({
      label: 'COI',
      status: 'not_provided',
    })
  })
})

describe('responsePdfFileName', () => {
  test('creates a safe download filename from the company name', () => {
    expect(
      responsePdfFileName({
        companyName: 'Acme Supplies LLC',
      } as never)
    ).toBe('share-response-acme-supplies-llc.pdf')
  })
})
