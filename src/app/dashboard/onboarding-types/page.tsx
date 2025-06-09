'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/lib/services/dashboard'
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
  Filter,
  AlertCircle,
  Building2,
  Send,
  Link
} from 'lucide-react'
import { CreateOnboardingTypeDialog } from '@/components/dashboard/CreateOnboardingTypeDialog'
import { SendOnboardingRequestDialog } from '@/components/dashboard/SendOnboardingRequestDialog'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { generateToken } from '@/lib/utils'
import { toast } from 'sonner'

export default function OnboardingTypesPage() {
  const { userProfile, user } = useAuth()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Check for schema error
  const hasSchemaError = userProfile?.contact_name === 'Schema Error - Please Fix Database'

  // Fetch onboarding types data
  const { data: onboardingTypes, isLoading, error, refetch } = useQuery({
    queryKey: ['onboarding-types-detailed', user?.id],
    queryFn: () => dashboardService.getOnboardingTypesWithStats(user!),
    enabled: !!user && !hasSchemaError,
    retry: 2,
  })
  // Filter types based on search
  const filteredTypes = onboardingTypes?.filter(type =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (type.description && type.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || []

  // Copy onboarding link function
  const copyOnboardingLink = async (typeId: string) => {
    try {
      const token = generateToken()
      const link = `${window.location.origin}/onboard/${token}?type=${typeId}`
      await navigator.clipboard.writeText(link)
      toast.success('Onboarding link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Failed to copy link')
    }
  }

  // Handle send request
  const handleSendRequest = (typeId: string) => {
    setSelectedTypeId(typeId)
    setShowSendDialog(true)
  }

  // Calculate stats
  const stats = {
    total: onboardingTypes?.length || 0,
    active: onboardingTypes?.filter(t => t.totalRequests > 0).length || 0,
    inactive: onboardingTypes?.filter(t => t.totalRequests === 0).length || 0,
    totalRequests: onboardingTypes?.reduce((sum, type) => sum + type.totalRequests, 0) || 0
  }
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Schema Error Banner */}
      {hasSchemaError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-full">
                <Building2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Database Schema Error</h3>
                <p className="text-sm text-red-700 mt-1">
                  The users table has the wrong schema. Please visit the{' '}
                  <a href="/debug" className="underline font-medium">debug page</a>{' '}
                  and use the "Fix Schema" button for instructions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !hasSchemaError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Error Loading Data</h3>
                <p className="text-sm text-red-700 mt-1">
                  There was an error loading your onboarding types. Please try refreshing the page.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={() => refetch()}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboarding Types</h1>
          <p className="text-muted-foreground">
            Create and manage your onboarding flows
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} disabled={hasSchemaError}>
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
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              ) : (
                stats.total
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Badge variant="default" className="h-4 w-4 rounded-full p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              ) : (
                stats.active
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Badge variant="secondary" className="h-4 w-4 rounded-full p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              ) : (
                stats.inactive
              )}
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
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              ) : (
                stats.totalRequests
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="flex gap-2 mt-2">
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-8 bg-gray-200 rounded"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="flex gap-1">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Onboarding Types Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Create New Card */}
            <Card 
              className="border-dashed border-2 hover:border-primary/50 cursor-pointer transition-colors" 
              onClick={() => setShowCreateDialog(true)}
            >
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
                        {type.description || "No description provided"}
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
                    <Badge variant={type.totalRequests > 0 ? 'default' : 'secondary'}>
                      {type.totalRequests > 0 ? 'active' : 'inactive'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Modified {new Date(type.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Total Requests</p>
                      <p className="text-2xl font-bold">{type.totalRequests}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{type.completedRequests}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Completion Rate</span>
                      <span>{type.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${type.completionRate}%` 
                        }}
                      ></div>
                    </div>
                  </div>                  {/* Required Documents */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Required Documents:</p>
                    <div className="flex flex-wrap gap-1">
                      {type.required_documents && Array.isArray(type.required_documents) ? (
                        <>
                          {type.required_documents.slice(0, 2).map((doc: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {typeof doc === 'string' ? doc : doc.name || 'Document'}
                            </Badge>
                          ))}
                          {type.required_documents.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{type.required_documents.length - 2} more
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No documents required
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyOnboardingLink(type.id)}
                      className="flex-1"
                    >
                      <Link className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(type.id)}
                      className="flex-1"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send Request
                    </Button>
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

          {/* No Data State */}
          {onboardingTypes?.length === 0 && !searchQuery && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No onboarding types yet</h3>
              <p className="mt-2 text-muted-foreground">
                Create your first onboarding flow to start collecting vendor information.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Type
              </Button>
            </div>
          )}
        </>
      )}      {/* Create Dialog */}
      <CreateOnboardingTypeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false)
          refetch() // Refresh the data after creating a new type
        }}
      />

      {/* Send Request Dialog */}
      <SendOnboardingRequestDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        onboardingTypeId={selectedTypeId}
        onSuccess={() => {
          setShowSendDialog(false)
          setSelectedTypeId(null)
          refetch() // Refresh the data after sending a request
        }}
      />
    </div>
  )
}
