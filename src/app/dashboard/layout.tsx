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
  const { user, userProfile, loading, isAdmin } = useAuth()
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

  // Check for RLS policy errors
  if (userProfile?.contact_name === 'RLS Policy Error - Check Database Policies') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-lg border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Database Access Issue</h2>            <p className="text-gray-600 mb-4">
              There&apos;s a security policy issue preventing access to your profile. 
              Please contact your administrator.
            </p>
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              <strong>For Developers:</strong> Run the RLS fix scripts in your Supabase SQL Editor.
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show profile setup if user profile is incomplete
  if (!userProfile?.company_name || !userProfile?.contact_name) {
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
