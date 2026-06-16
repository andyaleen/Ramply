'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface RamplyMarketingNavProps {
  onLoginClick?: () => void
}

/** Shared marketing header used on public marketing pages. */
export function RamplyMarketingNav({ onLoginClick }: RamplyMarketingNavProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <header className="bg-[#F0EFE9] border-b border-[#DDDCD5]">
      <div className="h-16 flex items-center justify-between px-6 md:px-12">
        <Link
          href="/"
          className="text-[20px] md:text-[24px] font-semibold text-[#0F1F18] hover:text-[#287253] transition-colors"
        >
          Ramply
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            href="/about"
            className={`text-[14px] md:text-[15px] px-3 py-1.5 rounded-lg transition-colors ${
              pathname === '/about'
                ? 'text-[#0F1F18] font-medium'
                : 'text-[#4A5C54] hover:text-[#0F1F18]'
            }`}
          >
            About
          </Link>
          <Link
            href="/pricing"
            className={`text-[14px] md:text-[15px] px-3 py-1.5 rounded-lg transition-colors ${
              pathname === '/pricing'
                ? 'text-[#0F1F18] font-medium'
                : 'text-[#4A5C54] hover:text-[#0F1F18]'
            }`}
          >
            Pricing
          </Link>
          <button
            type="button"
            onClick={onLoginClick ?? (() => router.push('/login'))}
            className="text-[14px] md:text-[15px] text-[#4A5C54] hover:text-[#0F1F18] px-3 py-1.5 rounded-lg"
          >
            Log in
          </button>
        </div>
      </div>
    </header>
  )
}
