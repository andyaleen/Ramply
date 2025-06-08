'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { Building, ArrowRight } from "lucide-react"

interface HeaderProps {
  showAuth?: boolean
  className?: string
}

export function Header({ showAuth = true, className = "" }: HeaderProps) {
  const router = useRouter()

  return (
    <header className={`border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/')}>
              <Building className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">VendorFlow</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-1">
              <span className="text-gray-700 hover:text-gray-900 cursor-pointer">Product</span>
              <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-gray-700 hover:text-gray-900 cursor-pointer">Solutions</span>
              <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
            </div>
            <span className="text-gray-700 hover:text-gray-900 cursor-pointer">Enterprise</span>
            <div className="flex items-center space-x-1">
              <span className="text-gray-700 hover:text-gray-900 cursor-pointer">Resources</span>
              <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
            </div>
            <span className="text-gray-700 hover:text-gray-900 cursor-pointer">Pricing</span>
          </nav>
          
          {showAuth && (
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/login')}
              >
                Log in
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push('/signup')}
              >
                Get started
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
