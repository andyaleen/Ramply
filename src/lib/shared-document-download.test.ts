import { describe, expect, test, vi } from 'vitest'

import { fetchSharedDocumentDownloadUrl } from './shared-document-download'

describe('fetchSharedDocumentDownloadUrl', () => {
  test('returns signed URL payload from API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        signedUrl: 'https://example.com/file.pdf',
        fileName: 'file.pdf',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchSharedDocumentDownloadUrl('11111111-1111-4111-8111-111111111111')

    expect(result).toEqual({
      signedUrl: 'https://example.com/file.pdf',
      fileName: 'file.pdf',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/documents/shared/download?document_id=11111111-1111-4111-8111-111111111111',
      { credentials: 'include' }
    )
  })
})
