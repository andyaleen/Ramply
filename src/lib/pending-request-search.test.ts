import { describe, expect, it } from 'vitest'

import { filterPendingSentRequests } from '@/lib/pending-request-search'
import type { PendingSentRequest } from '@/lib/requester-pending-requests'

const sampleRequests: PendingSentRequest[] = [
  {
    id: '1',
    request_type: 'Standard Vendor',
    recipient_email: 'vendor@acme.com',
    recipient_company_legal_name: 'Acme Supplies LLC',
    recipient_company_dba_name: null,
    mandatory_fields: [],
    optional_fields: [],
    mandatory_documents: [],
    optional_documents: [],
    expires_at: null,
    opened_at: null,
    created_at: '2025-06-01T14:30:00.000Z',
  },
  {
    id: '2',
    request_type: 'Insurance',
    recipient_email: 'finance@beta.io',
    recipient_company_legal_name: null,
    recipient_company_dba_name: 'Beta Co',
    mandatory_fields: [],
    optional_fields: [],
    mandatory_documents: [],
    optional_documents: [],
    expires_at: null,
    opened_at: null,
    created_at: '2025-05-15T09:00:00.000Z',
  },
]

describe('filterPendingSentRequests', () => {
  it('matches recipient email', () => {
    expect(filterPendingSentRequests(sampleRequests, 'vendor@acme')).toHaveLength(1)
  })

  it('matches recipient company name', () => {
    expect(filterPendingSentRequests(sampleRequests, 'beta co')).toHaveLength(1)
  })

  it('matches request type', () => {
    expect(filterPendingSentRequests(sampleRequests, 'insurance')).toHaveLength(1)
  })

  it('returns all rows when query is blank', () => {
    expect(filterPendingSentRequests(sampleRequests, '   ')).toHaveLength(2)
  })
})
