'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** This page has been deprecated — onboarding types are replaced by the catalog-based share request flow. */
export default function RequestTypesPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin') }, [router])
  return null
}
