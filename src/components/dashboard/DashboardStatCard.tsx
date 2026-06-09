import { Skeleton } from '@/components/ui/skeleton'

const serifTitle = "font-['Instrument_Serif',serif] tracking-tight"

interface StatCardProps {
  label: string
  value: number
  description: string
  icon?: React.ReactNode
  loading: boolean
  highlighted?: boolean
  onClick?: () => void
}

/**
 * Stat card with a top accent stripe, icon badge, and Instrument Serif metric.
 */
export function StatCard(props: StatCardProps) {
  if (props.onClick) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        className="relative overflow-hidden bg-white border border-[#DDDCD5] rounded-xl p-6 text-left transition-colors hover:border-[#287253] hover:bg-[#FAFAF7] focus:outline-none focus:ring-2 focus:ring-[#287253]/30"
        aria-label={`View ${props.label.toLowerCase()}`}
      >
        <StatCardContent {...props} />
      </button>
    )
  }

  return (
    <div className="relative overflow-hidden bg-white border border-[#DDDCD5] rounded-xl p-6 text-left">
      <StatCardContent {...props} />
    </div>
  )
}

/** Render the shared content inside dashboard stat cards. */
function StatCardContent({ label, value, description, icon, loading, highlighted }: StatCardProps) {
  const stripeColor = highlighted ? '#287253' : '#E8F2ED'

  return (
    <>
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: stripeColor }}
      />
      <div className="flex items-start justify-between">
        <p className="text-[13px] text-[#7A8C84]">{label}</p>
        {icon ? (
          <div className="h-8 w-8 rounded-lg bg-[#E8F2ED] text-[#287253] flex items-center justify-center">
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-10 w-16" />
        ) : (
          <p className={`${serifTitle} text-[38px] leading-none text-[#0F1F18]`}>{value}</p>
        )}
      </div>
      <p className="mt-2 text-[12px] font-light text-[#7A8C84]">{description}</p>
    </>
  )
}

/** Clock icon for pending dashboard metrics. */
export function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l2.5 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Document icon with checkmark for completed dashboard metrics. */
export function DocumentCheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path
        d="M6 2.5h5l4 4V16a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 015 16V4a1.5 1.5 0 011-1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 2.5v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 11.5l1.75 1.75L13 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Document icon for request and response dashboard cards. */
export function DocumentIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path
        d="M6 2.5h5l4 4V16a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 015 16V4a1.5 1.5 0 011-1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 2.5v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 10h4M8 13h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
