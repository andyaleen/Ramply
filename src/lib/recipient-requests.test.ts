import { describe, expect, test } from 'vitest'

import {
  RECIPIENT_REQUEST_COLUMNS,
  countPendingReceivedShareRequests,
  fetchReceivedShareRequests,
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
})
