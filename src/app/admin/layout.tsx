'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { SidebarProvider } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/dashboard/admin-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { ProfileSetup } from "@/components/profile/ProfileSetup"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, userProfile, company, loading, isAdmin } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }

    if (!loading && user && userProfile && !isAdmin) {
      console.log('Admin Layout: Non-admin user detected, redirecting to /dashboard')
      router.push('/dashboard')
    }
  }, [user, userProfile, loading, isAdmin, router])
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  // Show profile setup if company profile is incomplete
  if (!company?.legal_name || !company?.contact_name) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ProfileSetup onComplete={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  )
}
