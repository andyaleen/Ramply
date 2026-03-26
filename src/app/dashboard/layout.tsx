'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { ProfileSetup } from "@/components/profile/ProfileSetup"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, userProfile, company, loading, isAdmin } = useAuth()
  console.log(userProfile, 'Dashboard Layout: User Profile')
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    
    // Redirect admin users to admin page
    if (!loading && user && userProfile && isAdmin) {
      console.log('Dashboard Layout: Admin user detected, redirecting to /admin')
      router.push('/admin')
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
        <AppSidebar />        
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  )
}
