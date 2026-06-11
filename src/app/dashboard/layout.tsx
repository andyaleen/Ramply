'use client'

import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardMobileHeader } from '@/components/dashboard/dashboard-mobile-header'
import { Toaster } from '@/components/ui/sonner'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ProtectedAppShell } from '@/components/auth/ProtectedAppShell'

/**
 * Dashboard shell: 200px dark-green sidebar on desktop, off-canvas drawer
 * on mobile with a compact top bar to open navigation.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedAppShell>
      <SidebarProvider
        style={{ '--sidebar-width': '12.5rem' } as React.CSSProperties}
        className="bg-[#F0EFE9]"
      >
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-[#F0EFE9]">
          <DashboardMobileHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </ProtectedAppShell>
  )
}
