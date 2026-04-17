// Legacy /admin layout — all /admin/* traffic is redirected to /dashboard/*
// via next.config.ts. This thin passthrough exists only because the file can't
// be removed from this sandbox; it's never rendered in practice.
export default function LegacyAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
