'use client'

import { Header } from './Header'
import { Footer } from './Footer'

interface LayoutProps {
  children: React.ReactNode
  showAuth?: boolean
  showHeader?: boolean
  showFooter?: boolean
  className?: string
}

export function Layout({ 
  children, 
  showAuth = true, 
  showHeader = true, 
  showFooter = true,
  className = "" 
}: LayoutProps) {
  return (
    <div className={`min-h-screen bg-white flex flex-col ${className}`}>
      {showHeader && <Header showAuth={showAuth} />}
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}
