'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  FileText, 
  MoreVertical, 
  Eye, 
  Edit, 
  Copy, 
  Trash2,
  Search,
  Filter
} from 'lucide-react'
import { CreateOnboardingTypeDialog } from '@/components/dashboard/CreateOnboardingTypeDialog'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function OnboardingTypesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data - replace with real data later
  const onboardingTypes = [
    {
      id: 1,
      name: "Vendor Onboarding",
      description: "Standard vendor registration process including company details, tax information, and banking details",
      status: "active",
      requests: 12,
      completed: 8,
      created: "2024-01-15",
      lastModified: "2024-02-20",
      requiredDocuments: ["Business License", "Tax Certificate", "Bank Details"]
    },
    {
      id: 2,
      name: "Employee Onboarding",
      description: "New employee setup process with HR documentation and system access",
      status: "draft",
      requests: 0,
      completed: 0,
      created: "2024-01-20",
      lastModified: "2024-01-20",
      requiredDocuments: ["ID Document", "Contract", "Emergency Contact"]
    },
    {
      id: 3,
      name: "Supplier Registration",
      description: "New supplier onboarding flow with quality certifications and compliance checks",
      status: "active",
      requests: 7,
      completed: 5,
      created: "2024-01-10",
      lastModified: "2024-02-15",
      requiredDocuments: ["Quality Certificate", "Insurance", "References"]
    },
    {
      id: 4,
      name: "Contractor Onboarding",
      description: "Independent contractor registration with insurance and skill verification",
      status: "active",
      requests: 3,
      completed: 3,
      created: "2024-02-01",
      lastModified: "2024-02-10",
      requiredDocuments: ["Insurance Certificate", "Portfolio", "References"]
    }
  ]

  const filteredTypes = onboardingTypes.filter(type =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboarding Types</h1>
          <p className="text-muted-foreground">
            Create and manage your onboarding flows
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Type
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search onboarding types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Types</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onboardingTypes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Badge variant="default" className="h-4 w-4 rounded-full p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {onboardingTypes.filter(t => t.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Badge variant="secondary" className="h-4 w-4 rounded-full p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {onboardingTypes.filter(t => t.status === 'draft').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {onboardingTypes.reduce((sum, type) => sum + type.requests, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Types Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Create New Card */}
        <Card className="border-dashed border-2 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setShowCreateDialog(true)}>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center min-h-[280px]">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="mb-2">Create New Type</CardTitle>
            <CardDescription>
              Set up a new onboarding process for your organization
            </CardDescription>
          </CardContent>
        </Card>

        {/* Existing Onboarding Types */}
        {filteredTypes.map((type) => (
          <Card key={type.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg">{type.name}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
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
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={type.status === 'active' ? 'default' : 'secondary'}>
                  {type.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Modified {new Date(type.lastModified).toLocaleDateString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Stats */}
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

              {/* Progress */}
              <div>
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

              {/* Required Documents */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Required Documents:</p>
                <div className="flex flex-wrap gap-1">
                  {type.requiredDocuments.slice(0, 2).map((doc, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {doc}
                    </Badge>
                  ))}
                  {type.requiredDocuments.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{type.requiredDocuments.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTypes.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No onboarding types found</h3>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your search terms or create a new onboarding type.
          </p>
        </div>
      )}

      {/* Create Dialog */}
      <CreateOnboardingTypeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => setShowCreateDialog(false)}
      />
    </div>
  )
}
