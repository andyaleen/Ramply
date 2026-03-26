'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,  
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronUp,
  User,
  LogOut,
  Settings,
  Users,
  BarChart3,
  Briefcase,
  Mail,
  CreditCard,
  BookTemplate,
} from "lucide-react"
import { usePathname, useRouter } from 'next/navigation'

// Admin-specific navigation configuration
const adminNavigationConfig = [
  {
    title: "Dashboard",
    items: [
      {
        title: "Overview",
        url: "/admin",
        icon: BarChart3,
        badge: null,
        isNew: false,
      },
    ],
  },
  {
    title: "Onboarding Management",
    items: [
      {
        title: "Send Links",
        url: "/admin/send-links",
        icon: Mail,
        badge: null,
        isNew: false,
      },
      {
        title: "Templates",
        url: "/admin/templates",
        icon: BookTemplate,
        badge: null,
        isNew: false,
      },
      {
        title: "Responses",
        url: "/admin/responses",
        icon: Users,
        badge: null,
        isNew: false,
      },
      {
        title: "Billing",
        url: "/admin/billing",
        icon: CreditCard,
        badge: null,
        isNew: false,
      },
    ],
  },
]

export function AdminSidebar() {
  const { userProfile, company, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <Sidebar variant="inset">      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="bg-primary p-2 rounded-lg">
            <Briefcase className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg">Company Admin</span>
            <span className="text-xs text-muted-foreground">
              {company?.legal_name || 'Onboarding Management'}
            </span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {adminNavigationConfig.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      isActive={pathname === item.url}
                      onClick={() => router.push(item.url)}
                      className="flex items-center gap-2 w-full cursor-pointer"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge 
                          variant={item.isNew ? "default" : "secondary"} 
                          className="text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {company?.contact_name ? getUserInitials(company.contact_name) : 'AD'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {company?.contact_name || 'Admin User'}
                    </span>                    <span className="truncate text-xs text-muted-foreground">
                      Company Administrator
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {company?.contact_name ? getUserInitials(company.contact_name) : 'AD'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {company?.contact_name || 'Admin User'}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {userProfile?.email || 'admin@company.com'}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/admin/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>                
                <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

