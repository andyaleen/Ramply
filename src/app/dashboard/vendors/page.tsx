'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Clock
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Mock data - replace with real data later
  const vendors = [
    {
      id: 1,
      name: "Acme Corporation",
      contactName: "John Doe",
      email: "john.doe@acme.com",
      phone: "+1 (555) 123-4567",
      address: "123 Business St, New York, NY 10001",
      status: "active",
      onboardingType: "Vendor Onboarding",
      joinedDate: "2024-01-15",
      lastActivity: "2024-06-07",
      totalRequests: 3,
      completedRequests: 2,
      businessType: "Corporation",
      documents: ["Business License", "Tax Certificate", "Insurance"]
    },
    {
      id: 2,
      name: "Tech Solutions Ltd",
      contactName: "Sarah Smith",
      email: "sarah.smith@techsol.com",
      phone: "+1 (555) 234-5678",
      address: "456 Tech Ave, San Francisco, CA 94105",
      status: "active",
      onboardingType: "Supplier Registration",
      joinedDate: "2024-02-20",
      lastActivity: "2024-06-06",
      totalRequests: 1,
      completedRequests: 1,
      businessType: "Limited Company",
      documents: ["Quality Certificate", "Insurance", "References"]
    },
    {
      id: 3,
      name: "Global Services Inc",
      contactName: "Mike Johnson",
      email: "mike.johnson@global.com",
      phone: "+1 (555) 345-6789",
      address: "789 Service Blvd, Chicago, IL 60601",
      status: "pending",
      onboardingType: "Contractor Onboarding",
      joinedDate: "2024-03-10",
      lastActivity: "2024-06-07",
      totalRequests: 2,
      completedRequests: 1,
      businessType: "LLC",
      documents: ["Insurance Certificate", "Portfolio"]
    },
    {
      id: 4,
      name: "Enterprise Partners",
      contactName: "Lisa Wang",
      email: "lisa.wang@enterprise.com",
      phone: "+1 (555) 456-7890",
      address: "321 Enterprise Dr, Austin, TX 73301",
      status: "inactive",
      onboardingType: "Vendor Onboarding",
      joinedDate: "2024-01-05",
      lastActivity: "2024-05-15",
      totalRequests: 4,
      completedRequests: 3,
      businessType: "Corporation",
      documents: ["Business License", "Tax Certificate", "Bank Details", "Insurance"]
    },
    {
      id: 5,
      name: "StartupXYZ",
      contactName: "Alex Chen",
      email: "alex@startupxyz.com",
      phone: "+1 (555) 567-8901",
      address: "654 Innovation Way, Seattle, WA 98101",
      status: "draft",
      onboardingType: "Vendor Onboarding",
      joinedDate: "2024-05-20",
      lastActivity: "2024-06-04",
      totalRequests: 1,
      completedRequests: 0,
      businessType: "Startup",
      documents: ["Business License"]
    }
  ]

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

  const filteredVendors = vendors.filter(vendor =>
    (statusFilter === 'all' || vendor.status === statusFilter) &&
    (vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     vendor.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     vendor.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const stats = {
    total: vendors.length,
    active: vendors.filter(v => v.status === 'active').length,
    pending: vendors.filter(v => v.status === 'pending').length,
    inactive: vendors.filter(v => v.status === 'inactive').length,
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            Manage your vendor relationships and onboarding status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
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
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <div className="h-4 w-4 rounded-full bg-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
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
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          More Filters
        </Button>
      </div>

      {/* Vendors Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredVendors.map((vendor) => (
          <Card key={vendor.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{vendor.name}</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    {vendor.businessType}
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
                  Since {new Date(vendor.joinedDate).toLocaleDateString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Contact Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{vendor.contactName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{vendor.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-xs">{vendor.address}</span>
                </div>
              </div>

              {/* Onboarding Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Onboarding Progress</span>
                  <span className="font-medium">
                    {vendor.completedRequests}/{vendor.totalRequests}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ 
                      width: `${vendor.totalRequests > 0 ? (vendor.completedRequests / vendor.totalRequests) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Type: {vendor.onboardingType}
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Documents:</p>
                <div className="flex flex-wrap gap-1">
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
                </div>
              </div>

              {/* Last Activity */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Last activity: {new Date(vendor.lastActivity).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredVendors.length === 0 && (
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
