'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Users, CheckCircle, Clock, Building2, MoreVertical } from 'lucide-react'
import { CreateOnboardingTypeDialog } from '@/components/dashboard/CreateOnboardingTypeDialog'
import { useState } from 'react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Mock data for the grid - replace with real data later
  const onboardingTypes = [
    {
      id: 1,
      name: "Vendor Onboarding",
      description: "Standard vendor registration process",
      status: "active",
      requests: 12,
      completed: 8,
      created: "2024-01-15"
    },
    {
      id: 2,
      name: "Employee Onboarding",
      description: "New employee setup process",
      status: "draft",
      requests: 0,
      completed: 0,
      created: "2024-01-20"
    },
    {
      id: 3,
      name: "Supplier Registration",
      description: "New supplier onboarding flow",
      status: "active",
      requests: 7,
      completed: 5,
      created: "2024-01-10"
    }
  ]

  const stats = [
    {
      title: "Total Onboarding Types",
      value: onboardingTypes.length,
      icon: FileText,
      description: "Active flows"
    },
    {
      title: "Pending Requests",
      value: onboardingTypes.reduce((sum, type) => sum + type.requests - type.completed, 0),
      icon: Clock,
      description: "Awaiting completion"
    },
    {
      title: "Completed This Month",
      value: onboardingTypes.reduce((sum, type) => sum + type.completed, 0),
      icon: CheckCircle,
      description: "Successfully processed"
    },
    {
      title: "Total Vendors",
      value: 156,
      icon: Users,
      description: "Registered vendors"
    }
  ]

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>          
          <p className="text-muted-foreground">
            Welcome back, {userProfile?.contact_name || 'there'}! Here&apos;s what&apos;s happening with your onboarding flows.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Flow
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Onboarding Types Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Onboarding Types</h2>
            <p className="text-muted-foreground">
              Manage your onboarding flows and track their performance
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Create New Card */}
          <Card className="border-dashed border-2 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setShowCreateDialog(true)}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center min-h-[200px]">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="mb-2">Create New Flow</CardTitle>
              <CardDescription>
                Set up a new onboarding process for your vendors or employees
              </CardDescription>
            </CardContent>
          </Card>

          {/* Existing Onboarding Types */}
          {onboardingTypes.map((type) => (
            <Card key={type.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {type.description}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>View Requests</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={type.status === 'active' ? 'default' : 'secondary'}>
                    {type.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(type.created).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Total Requests</p>
                    <p className="text-2xl font-bold">{type.requests}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{type.completed}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Completion Rate</span>
                    <span>{type.requests > 0 ? Math.round((type.completed / type.requests) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${type.requests > 0 ? (type.completed / type.requests) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Recent Activity</h2>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[
                { action: "New vendor request submitted", type: "Vendor Onboarding", time: "2 hours ago", status: "pending" },
                { action: "Onboarding completed", type: "Supplier Registration", time: "4 hours ago", status: "completed" },
                { action: "Document uploaded", type: "Vendor Onboarding", time: "6 hours ago", status: "in-progress" },
                { action: "New onboarding type created", type: "Employee Onboarding", time: "1 day ago", status: "info" },
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 rounded-lg border">
                  <div className={`rounded-full p-2 ${
                    activity.status === 'completed' ? 'bg-green-100 text-green-600' :
                    activity.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                    activity.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {activity.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                     activity.status === 'pending' ? <Clock className="h-4 w-4" /> :
                     activity.status === 'in-progress' ? <FileText className="h-4 w-4" /> :
                     <Building2 className="h-4 w-4" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.type}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <CreateOnboardingTypeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => setShowCreateDialog(false)}
      />
    </div>
  )
}
