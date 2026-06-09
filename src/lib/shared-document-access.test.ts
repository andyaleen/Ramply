import { describe, expect, test, vi } from 'vitest'

import { loadDownloadableDocumentForUser } from './shared-document-access'

type QueryResult<T> = { data: T; error: null } | { data: null; error: { message: string } }

function mockAdminClient(handlers: Record<string, () => QueryResult<unknown>>) {
  return {
    from: vi.fn((table: string) => {
      const run = handlers[table]
      if (!run) {
        throw new Error(`Unexpected table: ${table}`)
      }

      const result = run()
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        maybeSingle: async () => result,
        then: (
          onFulfilled: (value: QueryResult<unknown>) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) => Promise.resolve(result).then(onFulfilled, onRejected),
      }
      return builder
    }),
  }
}

describe('loadDownloadableDocumentForUser', () => {
  test('allows completed-share requesters to download shared files', async () => {
    let companiesCalls = 0
    const admin = mockAdminClient({
      company_documents: () => ({
        data: {
          file_path: 'recipient-user/W9/123_file.pdf',
          file_name: 'file.pdf',
          company_id: 'company-recipient',
        },
        error: null,
      }),
      companies: () => {
        companiesCalls += 1
        if (companiesCalls === 1) {
          return { data: null, error: null }
        }
        return { data: { id: 'company-requester' }, error: null }
      },
      shared_documents: () => ({
        data: [{ share_request_id: 'share-1' }],
        error: null,
      } as QueryResult<Array<{ share_request_id: string }>>),
      share_requests: () => ({
        data: [{ requester_company_id: 'company-requester' }],
        error: null,
      } as QueryResult<Array<{ requester_company_id: string }>>),
    })

    const result = await loadDownloadableDocumentForUser(
      admin as never,
      'requester-user',
      'doc-1'
    )

    expect(result).toEqual({
      file_path: 'recipient-user/W9/123_file.pdf',
      file_name: 'file.pdf',
    })
  })

  test('returns null when the user has no owner or requester access', async () => {
    const admin = mockAdminClient({
      company_documents: () => ({
        data: {
          file_path: 'recipient-user/W9/123_file.pdf',
          file_name: 'file.pdf',
          company_id: 'company-recipient',
        },
        error: null,
      }),
      companies: () => ({
        data: null,
        error: null,
      }),
      shared_documents: () => ({
        data: [],
        error: null,
      } as QueryResult<Array<{ share_request_id: string }>>),
    })

    const result = await loadDownloadableDocumentForUser(
      admin as never,
      'other-user',
      'doc-1'
    )

    expect(result).toBeNull()
  })
})
