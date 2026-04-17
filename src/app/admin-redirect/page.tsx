'use client'

import { useEffect } from 'react'

export default function AdminRedirectPage() {
  useEffect(() => {
    window.location.replace('/post-login?next=/admin')
  }, [])

  return null
}
