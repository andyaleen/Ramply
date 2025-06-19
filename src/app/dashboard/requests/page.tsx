'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { requestsService, OnboardingRequestDetailed } from '@/lib/services/requests'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  Building2,
  Mail,
  MapPin,
  FileText
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Database } from '@/lib/database.types'

type ExtendedRequest = OnboardingRequestDetailed & {
  documents?: Database['public']['Tables']['documents']['Row'][]
  consent_data?: Database['public']['Tables']['onboarding_consent']['Row'][]
  completed_by_user?: Database['public']['Tables']['users']['Row']
}

export default function RequestsPage() {  const { userProfile, user } = useAuth()
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState<ExtendedRequest | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  // Check for schema error
  const hasSchemaError = userProfile?.contact_name === 'Schema Error - Please Fix Database'

  // Fetch requests data
  const { data: requests, isLoading, error, refetch } = useQuery({
    queryKey: ['onboarding-requests', user?.id],
    queryFn: () => requestsService.getDetailedRequests(user!),
    enabled: !!user && !hasSchemaError,
    retry: 2,
  })

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['requests-stats', user?.id],
    queryFn: () => requestsService.getRequestsStats(user!),
    enabled: !!user && !hasSchemaError,
    retry: 2,
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      expired: 'destructive'    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }
  
  const filteredRequests = requests?.filter(request =>
    (statusFilter === 'all' || request.status === statusFilter) &&
    (requestsService.getVendorDisplayName(request).toLowerCase().includes(searchQuery.toLowerCase()) ||
     requestsService.getContactEmail(request).toLowerCase().includes(searchQuery.toLowerCase()) ||
     request.onboarding_types?.name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || []  // Handle view details
  const handleViewDetails = async (request: OnboardingRequestDetailed) => {
    try {
      // Fetch additional details if needed
      const { data: detailedRequest, error } = await supabase
        .from('onboarding_requests')
        .select(`
          *,
          onboarding_types (
            id,
            name,
            description,
            required_fields,
            required_documents
          ),
          completed_by_user:users!onboarding_requests_completed_by_fkey (
            id,
            contact_name,
            email,
            company_name,
            tax_id,
            business_type,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            country
          )
        `)
        .eq('id', request.id)
        .single()
      
      if (error) throw error
      
      // Get documents for this request
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('request_id', request.id)
      
      if (docsError) throw docsError
        // Get consent data
      const { data: consentData, error: consentError } = await supabase
        .from('onboarding_consent')
        .select('*')
        .eq('request_id', request.id)
      
      if (consentError) throw consentError
      
      setSelectedRequest({
        ...detailedRequest,
        documents: documents || [],
        consent_data: consentData || []
      })
      setShowDetailsDialog(true)
    } catch (error) {
      console.error('Error loading request details:', error)
      toast.error('Failed to load request details')
    }
  }
  // Handle message/contact
  const handleContact = (request: OnboardingRequestDetailed) => {
    const email = requestsService.getContactEmail(request)
    const subject = `Regarding Onboarding Request - ${request.onboarding_types?.name || 'Onboarding'}`
    const body = `Hi,\n\nI wanted to follow up on your onboarding request for ${request.onboarding_types?.name || 'our onboarding process'}.\n\nBest regards`
    
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink, '_blank')
  }

  // Download document function
  const downloadDocument = async (doc: { id: string; file_name: string }) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.id)

      if (error) throw error

      // Create blob URL and download
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`Downloaded ${doc.file_name}`)
    } catch (error) {
      console.error('Failed to download file:', error)
      toast.error('Failed to download file. Please try again.')
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
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
                  and use the &quot;Fix Schema&quot; button for instructions.
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
                <h3 className="font-semibold text-red-800">Error Loading Requests</h3>
                <p className="text-sm text-red-700 mt-1">
                  There was an error loading your requests data. Please try refreshing the page.
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
          <h1 className="text-3xl font-bold tracking-tight">Onboarding Requests</h1>
          <p className="text-muted-foreground">
            Track and manage all vendor onboarding submissions
          </p>        
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
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              ) : (
                stats?.expired || 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              ) : (
                stats?.completed || 0
              )}
            </div>          </CardContent>
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
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="expired">Expired</option>
        </select>
        <Button variant="outline" disabled={hasSchemaError || isLoading}>
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
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : (
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
                        <div className="font-medium">{requestsService.getVendorDisplayName(request)}</div>
                        <div className="text-sm text-muted-foreground">{requestsService.getContactEmail(request)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {request.onboarding_types?.name || 'Unknown Type'}
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
                          {request.completionPercentage || 0}%
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${request.completionPercentage || 0}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {request.documentsCount || 0}/{request.onboarding_types?.required_documents?.length || 0} docs
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {requestsService.formatTimeAgo(request.updated_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleContact(request)}
                          title="Contact Vendor"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>                  
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Empty State */}
      {!isLoading && filteredRequests.length === 0 && !hasSchemaError && (
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

      {/* Request Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Request Details
            </DialogTitle>
            <DialogDescription>
              View comprehensive details about this onboarding request including company information, submitted documents, and contact details.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Onboarding Type</label>
                      <p className="mt-1 font-medium">{selectedRequest.onboarding_types?.name}</p>
                      {selectedRequest.onboarding_types?.description && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedRequest.onboarding_types.description}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1 flex items-center gap-2">
                        {getStatusIcon(selectedRequest.status)}
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                      <p className="mt-1">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                      <p className="mt-1">{requestsService.formatTimeAgo(selectedRequest.updated_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Recipient Email</label>
                      <p className="mt-1">{selectedRequest.recipient_email}</p>
                    </div>
                    {selectedRequest.completed_at && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Completed</label>
                        <p className="mt-1">{new Date(selectedRequest.completed_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Company Information */}
              {selectedRequest.completed_by_user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                        <p className="mt-1">{selectedRequest.completed_by_user.company_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Business Type</label>
                        <p className="mt-1">{selectedRequest.completed_by_user.business_type || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tax ID</label>
                        <p className="mt-1">{selectedRequest.completed_by_user.tax_id || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Information */}
              {selectedRequest.completed_by_user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                        <p className="mt-1">{selectedRequest.completed_by_user.contact_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          Email
                        </label>
                        <p className="mt-1">{selectedRequest.completed_by_user.email}</p>
                      </div>
                    </div>
                    
                    {/* Address */}
                    {(selectedRequest.completed_by_user.address_line1 || 
                      selectedRequest.completed_by_user.city || 
                      selectedRequest.completed_by_user.state) && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          Address
                        </label>
                        <div className="mt-1 text-sm">
                          {selectedRequest.completed_by_user.address_line1 && (
                            <p>{selectedRequest.completed_by_user.address_line1}</p>
                          )}
                          {selectedRequest.completed_by_user.address_line2 && (
                            <p>{selectedRequest.completed_by_user.address_line2}</p>
                          )}
                          <p>
                            {[
                              selectedRequest.completed_by_user.city,
                              selectedRequest.completed_by_user.state,
                              selectedRequest.completed_by_user.postal_code
                            ].filter(Boolean).join(', ')}
                          </p>
                          {selectedRequest.completed_by_user.country && (
                            <p>{selectedRequest.completed_by_user.country}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Submitted Documents */}
              {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Submitted Documents ({selectedRequest.documents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedRequest.documents.map((doc: Database['public']['Tables']['documents']['Row']) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium">{doc.document_type}</p>
                              <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(doc.file_size)} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(doc)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Form Data */}
              {selectedRequest.consent_data && selectedRequest.consent_data.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Form Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedRequest.consent_data.map((consent: Database['public']['Tables']['onboarding_consent']['Row'], index: number) => (
                        <div key={consent.id || index} className="p-4 border rounded-lg">
                          <div className="mb-2">                            <span className="text-sm text-muted-foreground">
                              Submitted: {consent.submitted_at ? new Date(consent.submitted_at).toLocaleDateString() : 'Not submitted'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(consent.form_data || {}).map(([key, value]) => (
                              <div key={key}>
                                <label className="text-sm font-medium text-muted-foreground capitalize">
                                  {key.replace(/_/g, ' ')}
                                </label>
                                <p className="mt-1">{String(value) || 'N/A'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleContact(selectedRequest)}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Contact Vendor
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
