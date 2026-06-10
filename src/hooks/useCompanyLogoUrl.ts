'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createVaultDocumentSignedUrl } from '@/lib/vault-documents'

/** Resolve a signed URL for the company's logo, refreshing when the path changes. */
export function useCompanyLogoUrl(logoPath: string | null | undefined) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!logoPath) {
      setLogoUrl(null)
      return
    }

    let cancelled = false
    setLoading(true)

    const supabase = createClient()
    createVaultDocumentSignedUrl(supabase, logoPath)
      .then((url) => {
        if (!cancelled) setLogoUrl(url)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [logoPath])

  return { logoUrl, loading }
}
