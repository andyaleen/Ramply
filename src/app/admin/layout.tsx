'use client'

import { SidebarProvider } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/dashboard/admin-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { ProtectedAppShell } from '@/components/auth/ProtectedAppShell'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedAppShell>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </div>
        <Toaster />
      </SidebarProvider>
    </ProtectedAppShell>
  )
}
