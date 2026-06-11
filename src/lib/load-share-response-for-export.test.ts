import { describe, expect, test, vi } from 'vitest'

vi.mock('@/lib/requester-share-responses', () => ({
  fetchSharedDocumentsForRequester: vi.fn(async () => []),
  fetchSharedRecipientCompanies: vi.fn(async () => []),
  SHARE_REQUEST_COLUMNS_WITH_DENIED: '*',
}))

import { loadShareResponseForExport } from './load-share-response-for-export'

const USER_ID = '11111111-1111-1111-1111-111111111111'
const REQUEST_ID = '22222222-2222-2222-2222-222222222222'
const COMPANY_ID = '33333333-3333-3333-3333-333333333333'

function buildAdminMock(logoPath: string | null) {
  const download = vi.fn()
  const shareRequest = {
    id: REQUEST_ID,
    status: 'completed',
    requester_company_id: COMPANY_ID,
    completed_by_company_id: null,
    denied_by_company_id: null,
  }

  const admin = {
    from: vi.fn((table: string) => {
      if (table === 'share_requests') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: shareRequest, error: null }),
            }),
          }),
        }
      }

      if (table === 'companies') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: COMPANY_ID, legal_name: 'Acme', logo_path: logoPath },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'shared_data') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
    storage: {
      from: () => ({ download }),
    },
  }

  return { admin, download }
}

describe('loadShareResponseForExport', () => {
  test('does not download logo storage when logo_path is outside the user logo folder', async () => {
    const { admin, download } = buildAdminMock('99999999-9999-9999-9999-999999999999/W9/doc.pdf')

    const result = await loadShareResponseForExport(admin as never, USER_ID, REQUEST_ID)

    expect(result?.branding.logoPath).toBeNull()
    expect(result?.branding.logoBuffer).toBeNull()
    expect(download).not.toHaveBeenCalled()
  })

  test('downloads logo storage for a canonical user-owned logo path', async () => {
    const logoPath = `${USER_ID}/logo/logo.png`
    const { admin, download } = buildAdminMock(logoPath)
    download.mockResolvedValue({
      data: new Blob([Uint8Array.from([137, 80, 78, 71])], { type: 'image/png' }),
      error: null,
    })

    const result = await loadShareResponseForExport(admin as never, USER_ID, REQUEST_ID)

    expect(result?.branding.logoPath).toBe(logoPath)
    expect(result?.branding.logoBuffer).not.toBeNull()
    expect(download).toHaveBeenCalledWith(logoPath)
  })
})
