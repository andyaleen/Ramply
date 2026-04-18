'use client'

import { useEffect } from 'react'

export default function AdminRedirectPage() {
  useEffect(() => {
    window.location.replace('/dashboard')
  }, [])

  return null
}
