'use client'

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { ProtectedAppShell } from '@/components/auth/ProtectedAppShell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedAppShell>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </div>
        <Toaster />
      </SidebarProvider>
    </ProtectedAppShell>
  )
}
