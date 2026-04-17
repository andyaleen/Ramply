import {
  Home,
  Settings,
  Users,
  Building2,
  BarChart3,
  BookTemplate,
  HelpCircle,
  User,
  Bell,
  FileText,
  Plus,
  Search,
  Shield,
  Workflow,
  Calendar,
  CreditCard,
  Mail,
  MessageSquare,
  Archive,
  Download,
  Upload,
  Globe,
  Lock,
  TrendingUp,
  PieChart
} from 'lucide-react'

export interface DashboardRoute {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  component: string
  category?: string
  badge?: string
  permissions?: string[]
  isNew?: boolean
  isComingSoon?: boolean
}

export interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

export interface NavigationItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  isNew?: boolean
}

// Dynamic route configurations
export const dashboardRoutes: Record<string, DashboardRoute> = {
  // Core dashboard sections
  overview: {
    title: 'Dashboard Overview',
    description: 'Get an overview of your onboarding activities and key metrics',
    icon: Home,
    component: 'DashboardOverview',
    category: 'core'
  },
  analytics: {
    title: 'Analytics & Reports',
    description: 'View detailed analytics, metrics, and generate reports',
    icon: BarChart3,
    component: 'AnalyticsPage',
    category: 'analytics'
  },
  vendors: {
    title: 'Vendor Management',
    description: 'Manage your vendor relationships, data, and communications',
    icon: Building2,
    component: 'VendorsPage',
    category: 'management'
  },
  requests: {
    title: 'Onboarding Requests',
    description: 'Track and manage all onboarding requests and their status',
    icon: Users,
    component: 'RequestsPage',
    category: 'core'
  },
  'onboarding-types': {
    title: 'Onboarding Types',
    description: 'Configure different types of onboarding processes and requirements',
    icon: FileText,
    component: 'OnboardingTypesPage',
    category: 'configuration'
  },
  settings: {
    title: 'Settings',
    description: 'Manage your account, preferences, and application settings',
    icon: Settings,
    component: 'SettingsPage',
    category: 'administration'
  },
  help: {
    title: 'Help & Support',
    description: 'Get help, support, and access documentation',
    icon: HelpCircle,
    component: 'HelpPage',
    category: 'support'
  },
  profile: {
    title: 'User Profile',
    description: 'View and edit your profile information and preferences',
    icon: User,
    component: 'ProfilePage',
    category: 'account'
  },
  notifications: {
    title: 'Notifications',
    description: 'View and manage your notifications and alerts',
    icon: Bell,
    component: 'NotificationsPage',
    category: 'account'
  },

  // Extended features
  reports: {
    title: 'Reports Center',
    description: 'Generate, schedule, and download various business reports',
    icon: TrendingUp,
    component: 'ReportsPage',
    category: 'analytics',
    isNew: true
  },
  documents: {
    title: 'Documents',
    description: 'Documents',
    icon: Archive,
    component: 'DocumentsPage',
    category: 'management'
  },
  compliance: {
    title: 'Compliance Management',
    description: 'Track compliance requirements, audits, and regulatory status',
    icon: Shield,
    component: 'CompliancePage',
    category: 'governance'
  },
  integrations: {
    title: 'Integrations',
    description: 'Connect with external systems, APIs, and third-party services',
    icon: Plus,
    component: 'IntegrationsPage',
    category: 'administration'
  },
  audit: {
    title: 'Audit Trail',
    description: 'View system activity, user actions, and security logs',
    icon: Search,
    component: 'AuditPage',
    category: 'governance'
  },
  
  // Advanced features
  workflows: {
    title: 'Workflow Builder',
    description: 'Create and manage custom onboarding workflows',
    icon: Workflow,
    component: 'WorkflowsPage',
    category: 'automation',
    isComingSoon: true
  },
  calendar: {
    title: 'Calendar & Scheduling',
    description: 'Schedule meetings, deadlines, and onboarding milestones',
    icon: Calendar,
    component: 'CalendarPage',
    category: 'productivity',
    isComingSoon: true
  },
  communications: {
    title: 'Communications',
    description: 'Manage email templates, notifications, and vendor communications',
    icon: MessageSquare,
    component: 'CommunicationsPage',
    category: 'management'
  },
  'data-export': {
    title: 'Data Export',
    description: 'Export data in various formats for external analysis',
    icon: Download,
    component: 'DataExportPage',
    category: 'tools'
  },
  'data-import': {
    title: 'Data Import',
    description: 'Import vendor data and bulk upload information',
    icon: Upload,
    component: 'DataImportPage',
    category: 'tools'
  },
  api: {
    title: 'API Management',
    description: 'Manage API keys, webhooks, and developer resources',
    icon: Globe,
    component: 'ApiPage',
    category: 'developer'
  },
  security: {
    title: 'Security Center',
    description: 'Monitor security, manage access controls, and review permissions',
    icon: Lock,
    component: 'SecurityPage',
    category: 'governance'
  },
  dashboard: {
    title: 'Custom Dashboards',
    description: 'Create and customize personal dashboards with widgets',
    icon: PieChart,
    component: 'CustomDashboardPage',
    category: 'customization',
    isNew: true
  }
}

// Dynamic navigation configuration
export const navigationConfig: NavigationGroup[] = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
      },
      {
        title: "Send Requests",
        url: "/dashboard/send-links",
        icon: Mail,
      },
      {
        title: "Responses",
        url: "/dashboard/responses",
        icon: Users,
      },
      {
        title: "Templates",
        url: "/dashboard/templates",
        icon: BookTemplate,
      },
      {
        title: "Received",
        url: "/dashboard/requests",
        icon: FileText,
      },
      {
        title: "Documents",
        url: "/dashboard/documents",
        icon: Archive,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        title: "Billing",
        url: "/dashboard/billing",
        icon: CreditCard,
      },
      {
        title: "Profile",
        url: "/dashboard/profile",
        icon: User,
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
]

// Helper functions
export const getRouteConfig = (route: string): DashboardRoute | undefined => {
  return dashboardRoutes[route]
}

export const getRoutesByCategory = (category: string): Record<string, DashboardRoute> => {
  return Object.fromEntries(
    Object.entries(dashboardRoutes).filter(([, config]) => config.category === category)
  )
}

export const getAllCategories = (): string[] => {
  const categories = new Set(Object.values(dashboardRoutes).map(route => route.category).filter(Boolean))
  return Array.from(categories) as string[]
}

export const getNewRoutes = (): Record<string, DashboardRoute> => {
  return Object.fromEntries(
    Object.entries(dashboardRoutes).filter(([, config]) => config.isNew)
  )
}

export const getComingSoonRoutes = (): Record<string, DashboardRoute> => {
  return Object.fromEntries(
    Object.entries(dashboardRoutes).filter(([, config]) => config.isComingSoon)
  )
}

