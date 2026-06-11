'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'

/** Compact top bar shown on small screens to open the off-canvas nav drawer. */
export function DashboardMobileHeader() {
  return (
    <header className="md:hidden flex h-14 shrink-0 items-center gap-3 border-b border-[#DDDCD5] bg-[#F0EFE9] px-4">
      <SidebarTrigger
        className="size-10 shrink-0 text-[#0F1F18] hover:bg-[#E8E6DF]"
        aria-label="Open navigation menu"
      />
      <span className="text-[17px] font-semibold text-[#0F1F18]">
        Ramply
      </span>
    </header>
  )
}
