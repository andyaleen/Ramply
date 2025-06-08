'use client'

import { Building } from "lucide-react"
import { useRouter } from 'next/navigation'

interface FooterProps {
  className?: string
}

export function Footer({ className = "" }: FooterProps) {
  const router = useRouter()

  return (
    <footer className={`bg-white border-t border-gray-200 py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/')}>
              <Building className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-900">VendorFlow</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-8 text-sm text-gray-600">
            <span>© 2024</span>
            <span className="hover:text-gray-900 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-900 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-900 cursor-pointer">Contact</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
