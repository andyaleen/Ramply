import Link from 'next/link'

/** Shared footer for public marketing and legal pages. */
export function RamplyMarketingFooter() {
  return (
    <footer className="border-t border-[#DDDCD5] bg-white">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-[14px] text-[#7A8C84]">
          &copy; 2026 Ramply
        </p>
        <nav
          aria-label="Legal and support links"
          className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px] text-[#4A5C54]"
        >
          <Link href="/privacy" className="hover:text-[#0F1F18] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[#0F1F18] transition-colors">
            Terms of Service
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-xl border border-[#DDDCD5] px-4 py-2 text-[14px] font-medium text-[#0F1F18] transition-colors hover:border-[#287253] hover:text-[#287253]"
          >
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  )
}
