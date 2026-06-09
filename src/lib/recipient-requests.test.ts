import { describe, expect, test } from 'vitest'

import {
  RECIPIENT_REQUEST_COLUMNS,
  buildPendingReceivedRequestDisplay,
  countPendingReceivedShareRequests,
  fetchCompletedReceivedShareRequests,
  fetchPendingReceivedShareRequests,
  fetchReceivedShareRequests,
  fetchReceivedSubmissionDetails,
  resolveRequesterCompanyName,
  type ReceivedRequestsClient,
} from './recipient-requests'

type QueryResult<T> = {
  data: T | null
  error: Error | null
  count?: number | null
}

class FakeQuery<T> implements PromiseLike<QueryResult<T>> {
  readonly filters: Array<{ column: string; value: string }> = []
  readonly orders: Array<{ column: string; ascending: boolean }> = []

  constructor(private readonly result: QueryResult<T>) {}

  eq(column: string, value: string): FakeQuery<T> {
    this.filters.push({ column, value })
    return this
  }

  order(column: string, options: { ascending: boolean }): FakeQuery<T> {
    this.orders.push({ column, ascending: options.ascending })
    return this
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

class FakeReceivedRequestsClient {
  readonly selections: Array<{ columns: string; options?: { count?: 'exact'; head?: boolean } }> = []
  readonly queries: Array<FakeQuery<unknown>> = []

  constructor(private readonly result: QueryResult<unknown>) {}

  from(table: 'share_requests') {
    expect(table).toBe('share_requests')
    return {
      select: <T>(columns: string, options?: { count?: 'exact'; head?: boolean }) => {
        this.selections.push({ columns, options })
        const query = new FakeQuery<T>(this.result as QueryResult<T>)
        this.queries.push(query as FakeQuery<unknown>)
        return query
      },
    }
  }
}

describe('recipient request queries', () => {
  test('counts only pending requests addressed to the signed-in email', async () => {
    const client = new FakeReceivedRequestsClient({ data: null, error: null, count: 0 })

    const count = await countPendingReceivedShareRequests(
      client as unknown as ReceivedRequestsClient,
      '  User@Example.COM '
    )

    expect(count).toBe(0)
    expect(client.selections).toEqual([{ columns: 'id', options: { count: 'exact', head: true } }])
    expect(client.queries[0].filters).toEqual([
      { column: 'recipient_email', value: 'user@example.com' },
      { column: 'status', value: 'pending' },
    ])
  })

  test('loads the received page from recipient_email, not outgoing requester rows', async () => {
    const client = new FakeReceivedRequestsClient({ data: [], error: null })

    const requests = await fetchReceivedShareRequests(
      client as unknown as ReceivedRequestsClient,
      'Vendor@Example.com'
    )

    expect(requests).toEqual([])
    expect(client.selections[0].columns).toBe(RECIPIENT_REQUEST_COLUMNS)
    expect(client.queries[0].filters).toEqual([
      { column: 'recipient_email', value: 'vendor@example.com' },
    ])
    expect(client.queries[0].orders).toEqual([{ column: 'created_at', ascending: false }])
  })

  test('loads pending dashboard requests via recipient RPC', async () => {
    const client = {
      rpc: async () => ({
        data: [
          {
            id: 'req-1',
            token: 'token-1',
            created_at: '2026-06-01T00:00:00.000Z',
            requester_company_legal_name: 'Acme Corp',
            requester_company_dba_name: null,
            requester_email: 'sender@example.com',
          },
        ],
        error: null,
      }),
    }

    const requests = await fetchPendingReceivedShareRequests(
      client as unknown as ReceivedRequestsClient,
      'vendor@example.com'
    )

    expect(requests).toEqual([
      {
        id: 'req-1',
        token: 'token-1',
        created_at: '2026-06-01T00:00:00.000Z',
        companyName: 'Acme Corp',
        requesterEmail: 'sender@example.com',
        showEmailInSubtitle: true,
      },
    ])
  })

  test('loads completed received requests via recipient RPC', async () => {
    const client = {
      rpc: async () => ({
        data: [
          {
            id: 'req-2',
            token: 'token-2',
            request_type: 'Vendor onboarding',
            mandatory_fields: ['legal_name'],
            optional_fields: [],
            mandatory_documents: [],
            optional_documents: [],
            created_at: '2026-06-01T00:00:00.000Z',
            completed_at: '2026-06-02T00:00:00.000Z',
            requester_company_legal_name: 'Acme Corp',
            requester_company_dba_name: null,
            requester_email: 'sender@example.com',
            recipient_email: 'vendor@example.com',
          },
        ],
        error: null,
      }),
    }

    const requests = await fetchCompletedReceivedShareRequests(
      client as unknown as ReceivedRequestsClient,
      'vendor@example.com'
    )

    expect(requests).toEqual([
      {
        id: 'req-2',
        token: 'token-2',
        request_type: 'Vendor onboarding',
        mandatory_fields: ['legal_name'],
        optional_fields: [],
        mandatory_documents: [],
        optional_documents: [],
        created_at: '2026-06-01T00:00:00.000Z',
        completed_at: '2026-06-02T00:00:00.000Z',
        companyName: 'Acme Corp',
        requesterEmail: 'sender@example.com',
        recipientEmail: 'vendor@example.com',
      },
    ])
  })
})

describe('fetchReceivedSubmissionDetails', () => {
  test('loads submission details via recipient RPC', async () => {
    const client = {
      rpc: async () => ({
        data: {
          field_data: { legal_name: 'Vendor LLC' },
          documents: [
            {
              id: 'doc-1',
              company_id: 'company-1',
              document_type: 'W9',
              file_path: 'user/W9/file.pdf',
              file_name: 'file.pdf',
              file_size: 100,
              mime_type: 'application/pdf',
              file_hash: 'hash',
              version: 1,
              superseded_by: null,
              uploaded_at: '2026-06-02T00:00:00.000Z',
              extracted_fields: {},
              approved_fields: null,
            },
          ],
        },
        error: null,
      }),
    }

    const details = await fetchReceivedSubmissionDetails(
      client as unknown as ReceivedRequestsClient,
      'req-1'
    )

    expect(details.sharedData?.field_data).toEqual({ legal_name: 'Vendor LLC' })
    expect(details.sharedDocs).toHaveLength(1)
    expect(details.sharedDocs[0]?.document_type).toBe('W9')
  })
})

describe('resolveRequesterCompanyName', () => {
  test('prefers legal name over dba', () => {
    expect(
      resolveRequesterCompanyName({
        requester_company_legal_name: 'Acme LLC',
        requester_company_dba_name: 'Acme',
      })
    ).toBe('Acme LLC')
  })

  test('returns null when company names are missing', () => {
    expect(
      resolveRequesterCompanyName({
        requester_company_legal_name: null,
        requester_company_dba_name: null,
      })
    ).toBeNull()
  })
})

describe('buildPendingReceivedRequestDisplay', () => {
  test('shows company and email when profile data exists', () => {
    expect(
      buildPendingReceivedRequestDisplay({
        requester_company_legal_name: 'Acme LLC',
        requester_company_dba_name: 'Acme',
        requester_email: 'sender@example.com',
      })
    ).toEqual({
      companyName: 'Acme LLC',
      requesterEmail: 'sender@example.com',
      showEmailInSubtitle: true,
    })
  })

  test('falls back to requester email when company name is missing', () => {
    expect(
      buildPendingReceivedRequestDisplay({
        requester_company_legal_name: null,
        requester_company_dba_name: null,
        requester_email: 'sender@example.com',
      })
    ).toEqual({
      companyName: 'sender@example.com',
      requesterEmail: 'sender@example.com',
      showEmailInSubtitle: false,
    })
  })
})
