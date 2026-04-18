'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Fixed 200px sidebar rendered in dark forest green (#1A4D38). Displays
 * the Ramply brand header, grouped nav (Main / Account), and a pinned
 * user footer with an initials avatar.
 */
export function AppSidebar() {
  const { userProfile, company } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const contactName = company?.contact_name?.trim() || 'Account'
  const initials = getInitials(contactName)
  const email = company?.contact_email || userProfile?.email || ''
  const legalName = company?.legal_name || 'Ramply LLC'

  return (
    <aside
      className="flex flex-col h-screen w-[200px] shrink-0 sticky top-0 bg-[#1A4D38] text-white font-['DM_Sans',sans-serif]"
    >
      {/* Brand header */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.08]">
        <div className="text-[17px] font-semibold leading-none">Ramply</div>
        <div className="mt-1 text-[12px] text-white/70 leading-none truncate">{legalName}</div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="px-2 mb-2 text-[10px] tracking-widest uppercase text-white/35">
              {group.title}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.url
                return (
                  <li key={item.title}>
                    <button
                      type="button"
                      onClick={() => router.push(item.url)}
                      className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-[13.5px] transition-colors ${
                        active
                          ? 'bg-white/[0.12] text-white'
                          : 'text-white/70 hover:bg-white/[0.07] hover:text-white'
                      }`}
                    >
                      <span
                        className={`inline-flex items-center justify-center ${
                          active ? 'opacity-100' : 'opacity-70'
                        }`}
                      >
                        <NavIcon name={item.icon} />
                      </span>
                      <span className="flex-1 text-left">{item.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.08] px-3 py-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/profile')}
          className="w-full flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-white/[0.07] transition-colors"
        >
          <span className="h-[30px] w-[30px] rounded-full bg-[#3A9068] flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
            {initials}
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-[12.5px] text-white truncate">{contactName}</span>
            <span className="block text-[11px] text-white/60 truncate">{email}</span>
          </span>
        </button>
      </div>
    </aside>
  )
}

/** Extract up-to-two uppercase initials from a display name. */
function getInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return 'AA'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type IconName =
  | 'dashboard'
  | 'send'
  | 'chart'
  | 'template'
  | 'list'
  | 'document'
  | 'briefcase'
  | 'user'
  | 'settings'

interface NavItem {
  title: string
  url: string
  icon: IconName
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: 'dashboard' },
      { title: 'Send Requests', url: '/dashboard/send-links', icon: 'send' },
      { title: 'Responses', url: '/dashboard/responses', icon: 'chart' },
      { title: 'Templates', url: '/dashboard/templates', icon: 'template' },
      { title: 'Received', url: '/dashboard/requests', icon: 'list' },
      { title: 'Documents', url: '/dashboard/documents', icon: 'document' },
    ],
  },
  {
    title: 'Account',
    items: [
      { title: 'Billing', url: '/dashboard/billing', icon: 'briefcase' },
      { title: 'Profile', url: '/dashboard/profile', icon: 'user' },
      { title: 'Settings', url: '/dashboard/settings', icon: 'settings' },
    ],
  },
]

/** 16x16 stroke-based SVG icon set used in the dark sidebar. */
function NavIcon({ name }: { name: IconName }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </svg>
      )
    case 'send':
      return (
        <svg {...common}>
          <path d="M14 2L2 7l4.5 1.5L8 13l6-11z" />
          <path d="M6.5 8.5L10 5" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...common}>
          <path d="M2 13V3" />
          <path d="M2 13h12" />
          <path d="M5 11l2.5-3 2.5 2 3-4" />
        </svg>
      )
    case 'template':
      return (
        <svg {...common}>
          <rect x="3" y="2" width="10" height="12" rx="1.5" />
          <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
        </svg>
      )
    case 'list':
      return (
        <svg {...common}>
          <path d="M3 4h10M3 8h10M3 12h10" />
          <circle cx="1.5" cy="4" r="0.5" fill="currentColor" stroke="none" />
          <circle cx="1.5" cy="8" r="0.5" fill="currentColor" stroke="none" />
          <circle cx="1.5" cy="12" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'document':
      return (
        <svg {...common}>
          <path d="M4 2h5l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
          <path d="M9 2v3h3" />
        </svg>
      )
    case 'briefcase':
      return (
        <svg {...common}>
          <rect x="2" y="5" width="12" height="8" rx="1" />
          <path d="M6 5V3.5A1.5 1.5 0 017.5 2h1A1.5 1.5 0 0110 3.5V5" />
          <path d="M2 8.5h12" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="8" cy="6" r="2.5" />
          <path d="M3 14c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4" />
        </svg>
      )
  }
}
