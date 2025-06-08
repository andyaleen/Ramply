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
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Building2
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function RequestsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Mock data - replace with real data later
  const requests = [
    {
      id: 1,
      vendorName: "Acme Corporation",
      contactEmail: "john.doe@acme.com",
      onboardingType: "Vendor Onboarding",
      status: "pending",
      submittedAt: "2024-06-07T10:30:00Z",
      lastActivity: "2024-06-07T14:20:00Z",
      completionPercentage: 75,
      documentsRequired: 4,
      documentsSubmitted: 3
    },
    {
      id: 2,
      vendorName: "Tech Solutions Ltd",
      contactEmail: "sarah.smith@techsol.com",
      onboardingType: "Supplier Registration",
      status: "completed",
      submittedAt: "2024-06-05T09:15:00Z",
      lastActivity: "2024-06-06T16:45:00Z",
      completionPercentage: 100,
      documentsRequired: 3,
      documentsSubmitted: 3
    },
    {
      id: 3,
      vendorName: "Global Services Inc",
      contactEmail: "mike.johnson@global.com",
      onboardingType: "Contractor Onboarding",
      status: "in_review",
      submittedAt: "2024-06-06T15:20:00Z",
      lastActivity: "2024-06-07T11:10:00Z",
      completionPercentage: 100,
      documentsRequired: 5,
      documentsSubmitted: 5
    },
    {
      id: 4,
      vendorName: "StartupXYZ",
      contactEmail: "founder@startupxyz.com",
      onboardingType: "Vendor Onboarding",
      status: "rejected",
      submittedAt: "2024-06-04T08:00:00Z",
      lastActivity: "2024-06-05T10:30:00Z",
      completionPercentage: 60,
      documentsRequired: 4,
      documentsSubmitted: 2
    },
    {
      id: 5,
      vendorName: "Enterprise Partners",
      contactEmail: "admin@enterprise.com",
      onboardingType: "Supplier Registration",
      status: "draft",
      submittedAt: "2024-06-07T16:00:00Z",
      lastActivity: "2024-06-07T16:30:00Z",
      completionPercentage: 25,
      documentsRequired: 3,
      documentsSubmitted: 0
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'in_review':
        return <AlertCircle className="h-4 w-4 text-blue-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'draft':
        return <Eye className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      in_review: 'outline',
      rejected: 'destructive',
      draft: 'secondary'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const filteredRequests = requests.filter(request =>
    (statusFilter === 'all' || request.status === statusFilter) &&
    (request.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     request.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
     request.onboardingType.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    completed: requests.filter(r => r.status === 'completed').length,
    inReview: requests.filter(r => r.status === 'in_review').length,
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboarding Requests</h1>
          <p className="text-muted-foreground">
            Track and manage all vendor onboarding submissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
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
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inReview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search requests..."
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
          <option value="pending">Pending</option>
          <option value="in_review">In Review</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
        </select>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          More Filters
        </Button>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>
            All onboarding requests from vendors and partners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{request.vendorName}</div>
                      <div className="text-sm text-muted-foreground">{request.contactEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {request.onboardingType}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      {getStatusBadge(request.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {request.completionPercentage}%
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${request.completionPercentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {request.documentsSubmitted}/{request.documentsRequired} docs
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(request.submittedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {new Date(request.lastActivity).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No requests found</h3>
          <p className="mt-2 text-muted-foreground">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'No onboarding requests have been submitted yet.'
            }
          </p>
        </div>
      )}
    </div>
  )
}
