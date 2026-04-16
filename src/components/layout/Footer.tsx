'use client'

interface FooterProps {
  className?: string
}

export function Footer({ className = "" }: FooterProps) {
  return (
    <footer className={`bg-white border-t border-gray-200 py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center md:justify-end items-center">
          <div className="flex items-center space-x-8 text-sm text-gray-600">
            <span>&copy; 2026</span>
            <span className="hover:text-gray-900 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-900 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-900 cursor-pointer">Contact</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
