import { describe, expect, test, vi, beforeEach } from 'vitest'

import { databaseErrorResponse, resolveRpcError, rpcErrorResponse } from './api-error-response'

vi.mock('@/lib/monitoring', () => ({
  reportServerError: vi.fn(),
}))

describe('resolveRpcError', () => {
  test('maps known share request RPC codes', () => {
    expect(resolveRpcError('share_request_not_allowed')).toEqual({
      status: 403,
      message: 'You cannot modify this share request.',
    })
  })

  test('returns null for unknown messages', () => {
    expect(resolveRpcError('relation "secret_table" does not exist')).toBeNull()
  })
})

describe('rpcErrorResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns mapped client message for known RPC errors', async () => {
    const response = rpcErrorResponse('test', { message: 'share_request_not_allowed' }, 'fallback')
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'You cannot modify this share request.',
    })
  })

  test('returns fallback for unknown RPC errors', async () => {
    const response = rpcErrorResponse('test', { message: 'column users.secret leaked' }, 'Failed.')
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed.' })
  })
})

describe('databaseErrorResponse', () => {
  test('returns fallback for unknown database errors', async () => {
    const response = databaseErrorResponse('templates.list', { message: 'permission denied for table users' }, 'Failed to load templates.')
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to load templates.' })
  })
})
