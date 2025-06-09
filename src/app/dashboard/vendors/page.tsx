'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { vendorsService } from '@/lib/services/vendors'
import { 
  Search, 
  Filter, 
  Download,
  Plus,
  Building2,
  Mail,
  Phone,
  MapPin,
  Eye,
  Edit,
  MoreVertical,
  Users,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function VendorsPage() {
  const { userProfile, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Check for schema error
  const hasSchemaError = userProfile?.contact_name === 'Schema Error - Please Fix Database'

  // Fetch vendors data
  const { data: vendors, isLoading, error, refetch } = useQuery({
    queryKey: ['vendors', user?.id],
    queryFn: () => vendorsService.getVendorsWithStats(user!),
    enabled: !!user && !hasSchemaError,
    retry: 2,
  })

  // Fetch vendor stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['vendor-stats', user?.id],
    queryFn: () => vendorsService.getVendorStats(user!),
    enabled: !!user && !hasSchemaError,
    retry: 2,
  })
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'inactive':
        return <div className="h-4 w-4 rounded-full bg-gray-400" />
      case 'draft':
        return <Edit className="h-4 w-4 text-gray-600" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      pending: 'secondary',
      inactive: 'outline',
      draft: 'secondary'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    )
  }
  const filteredVendors = vendors?.filter(vendor =>
    (statusFilter === 'all' || vendor.status === statusFilter) &&
    (vendorsService.getVendorDisplayName(vendor).toLowerCase().includes(searchQuery.toLowerCase()) ||
     vendorsService.getContactDisplayName(vendor).toLowerCase().includes(searchQuery.toLowerCase()) ||
     vendor.email.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || []

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
                <h3 className="font-semibold text-red-800">Error Loading Vendors</h3>
                <p className="text-sm text-red-700 mt-1">
                  There was an error loading your vendors data. Please try refreshing the page.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                  className="mt-2"
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
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            Manage your vendor relationships and onboarding status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={hasSchemaError || isLoading}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button disabled={hasSchemaError || isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              ) : (
                stats?.total || 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              ) : (
                stats?.active || 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              ) : (
                stats?.pending || 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <div className="h-4 w-4 rounded-full bg-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              ) : (
                stats?.inactive || 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={hasSchemaError || isLoading}
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          disabled={hasSchemaError || isLoading}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
        <Button variant="outline" disabled={hasSchemaError || isLoading}>
          <Filter className="mr-2 h-4 w-4" />
          More Filters
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-6"></div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Vendors Grid */}
      {!isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{vendorsService.getVendorDisplayName(vendor)}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">
                      {vendor.business_type || 'Unknown Type'}
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
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(vendor.status)}
                  {getStatusBadge(vendor.status)}
                  <span className="text-xs text-muted-foreground">
                    Since {vendorsService.formatJoinedDate(vendor)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{vendorsService.getContactDisplayName(vendor)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{vendorsService.formatPhone(vendor)}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{vendorsService.formatAddress(vendor)}</span>
                  </div>
                </div>

                {/* Onboarding Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Onboarding Progress</span>
                    <span className="font-medium">
                      {vendor.completed_requests}/{vendor.total_requests}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ 
                        width: `${vendor.completion_rate}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Type: {vendor.onboarding_type || 'Not specified'}
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Documents:</p>
                  <div className="flex flex-wrap gap-1">
                    {vendor.documents.length > 0 ? (
                      <>
                        {vendor.documents.slice(0, 2).map((doc, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {doc}
                          </Badge>
                        ))}
                        {vendor.documents.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{vendor.documents.length - 2} more
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No documents</span>
                    )}
                  </div>
                </div>

                {/* Last Activity */}
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    Last activity: {vendorsService.formatLastActivity(vendor)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredVendors.length === 0 && !hasSchemaError && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No vendors found</h3>
          <p className="mt-2 text-muted-foreground">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'No vendors have been added yet. Create your first onboarding flow to get started.'
            }
          </p>
        </div>
      )}
    </div>
  )
}
