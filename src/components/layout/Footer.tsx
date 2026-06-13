'use client'

import Link from 'next/link'

interface FooterProps {
  className?: string
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`bg-white border-t border-gray-200 py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center md:justify-end items-center">
          <div className="flex items-center space-x-8 text-sm text-gray-600">
            <span>&copy; 2026 Ramply</span>
            <Link href="/privacy" className="hover:text-gray-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900">
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
