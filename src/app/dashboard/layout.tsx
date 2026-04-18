'use client'

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { ProtectedAppShell } from '@/components/auth/ProtectedAppShell'

/**
 * Dashboard shell: fixed 200px dark-green sidebar on the left with a
 * scrollable main content area filling the rest. No top nav — the
 * sidebar owns primary navigation.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedAppShell>
      <div className="min-h-screen flex w-full bg-[#F0EFE9]">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>
      <Toaster />
    </ProtectedAppShell>
  )
}
