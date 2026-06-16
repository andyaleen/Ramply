'use client'

import { RamplyMarketingNav } from '@/components/marketing/RamplyMarketingNav'

interface MarketingPublicShellProps {
  children: React.ReactNode
}

/** Shared full-page shell for public marketing and auth routes. */
export function MarketingPublicShell({ children }: MarketingPublicShellProps) {
  return (
    <div className="min-h-screen bg-[#F0EFE9] text-[#0F1F18] flex flex-col">
      <RamplyMarketingNav />
      {children}
    </div>
  )
}
