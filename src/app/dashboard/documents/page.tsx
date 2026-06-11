'use client'

import { DocumentVault } from '@/components/company/DocumentVault'

export default function DocumentsPage() {
  return (
    <div className="flex-1 min-w-0 p-4 sm:p-6 md:p-10">
      <div className="mx-auto w-full max-w-4xl">
        <DocumentVault />
      </div>
    </div>
  )
}
