'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  CheckCircle, 
  Eye, 
  Download, 
  FileText, 
  Building, 
  Calendar,
  User,
  Mail,
  MapPin
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface OnboardingResponse {
  id: string
  onboarding_type_id: string
  requester_user_id: string
  recipient_email: string
  status: string
  completed_by: string | null
  completed_at: string | null
  created_at: string
  onboarding_types: {
    id: string
    name: string
    description: string | null
    required_fields: any[]
    required_documents: any[]
  } | null
  completed_by_user: {
    id: string
    contact_name: string | null
    email: string
    company_name: string | null
    tax_id: string | null
    business_type: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
  } | null
  documents: {
    id: string
    document_type: string
    file_name: string
    file_size: number | null
    uploaded_at: string
  }[]
  consent_data: {
    id: string
    form_data: any
    submitted_at: string
  }[]
}

export function OnboardingResponsesList() {
  const { user } = useAuth()
  const supabase = createClient()
  const [selectedResponse, setSelectedResponse] = useState<OnboardingResponse | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  // Download document function
  const downloadDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path)

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
  const { data: responses, isLoading, error } = useQuery({
    queryKey: ['onboarding-responses', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('🚫 No user found')
        return []
      }
      
      console.log('🔍 Fetching onboarding responses for user:', user.id)
      
      // Query all onboarding requests from this admin
      const { data: allRequests, error: requestsError } = await supabase
        .from('onboarding_requests')
        .select(`
          *,
          onboarding_types (
            id,
            name,
            description,
            required_fields,
            required_documents
          )
        `)
        .eq('requester_user_id', user.id)
        .order('created_at', { ascending: false })

      if (requestsError) {
        console.error('❌ Error fetching requests:', requestsError)
        throw requestsError
      }

      console.log('🌐 ALL requests in database (any user):', allRequests?.length || 0)
      console.log('🌐 ALL requests details:', allRequests)

      if (!allRequests || allRequests.length === 0) {
        console.log('📋 No requests found for this admin user')
        return []
      }

      // For each request, get documents and consent data
      const responsePromises = allRequests.map(async (request) => {
        try {
          // Get documents for this request
          const { data: documents, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .eq('request_id', request.id)

          if (docsError) {
            console.error(`❌ Error fetching documents for request ${request.id}:`, docsError)
          }

          // Get consent data for this request
          const { data: consentData, error: consentError } = await supabase
            .from('onboarding_consent')
            .select('*')
            .eq('request_id', request.id)

          if (consentError) {
            console.error(`❌ Error fetching consent for request ${request.id}:`, consentError)
          }

          // Get user who completed this (if any)
          let completedByUser = null
          if (request.completed_by) {
            const { data: userData, error: userError } = await supabase
              .from('user_profiles')
              .select('id, contact_name, email, company_name')
              .eq('id', request.completed_by)
              .single()

            if (!userError && userData) {
              completedByUser = userData
            }
          }

          return {
            ...request,
            documents: documents || [],
            consent_data: consentData || [],
            completed_by_user: completedByUser
          }
        } catch (error) {
          console.error(`❌ Error processing request ${request.id}:`, error)
          return {
            ...request,
            documents: [],
            consent_data: [],
            completed_by_user: null
          }
        }
      })

      const responses = await Promise.all(responsePromises)
      
      console.log('📋 All requests found:', responses?.length || 0)
      console.log('📋 Request details:', responses)
      
      const completedResponses = responses.filter(r => r.status === 'completed')
      console.log('✅ Completed requests:', completedResponses.length)
      console.log('✅ Completed request details:', completedResponses)

      return responses
    },
    enabled: !!user,
  })

  const handleViewDetails = (response: OnboardingResponse) => {
    setSelectedResponse(response)
    setShowDetailsDialog(true)
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Responses</h3>
          <p className="text-gray-600 text-center">
            Failed to load onboarding responses. Please try again.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!responses?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Responses Yet</h3>
          <p className="text-gray-600 text-center">
            No completed onboarding responses found. Send some onboarding requests to get started!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Onboarding Type</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((response) => (
              <TableRow key={response.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{response.onboarding_types?.name}</div>
                    <div className="text-sm text-gray-500">{response.onboarding_types?.description}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{response.completed_by_user?.company_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{response.completed_by_user?.business_type || ''}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{response.completed_by_user?.contact_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{response.completed_by_user?.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {response.completed_at && formatDate(response.completed_at)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{response.documents.length} files</div>
                    {response.consent_data.length > 0 && (
                      <div className="text-gray-500">+ Form data</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(response)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Onboarding Response Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedResponse && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Onboarding Type</label>
                      <p className="mt-1">{selectedResponse.onboarding_types?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Completed On</label>
                      <p className="mt-1">{selectedResponse.completed_at && formatDate(selectedResponse.completed_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Information */}
              {selectedResponse.completed_by_user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Company Name</label>
                        <p className="mt-1">{selectedResponse.completed_by_user.company_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Business Type</label>
                        <p className="mt-1">{selectedResponse.completed_by_user.business_type || 'N/A'}</p>
                      </div>                      <div>
                        <label className="text-sm font-medium text-gray-500">Tax ID</label>
                        <p className="mt-1">{selectedResponse.completed_by_user.tax_id || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Information */}
              {selectedResponse.completed_by_user && (
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
                        <label className="text-sm font-medium text-gray-500">Contact Name</label>
                        <p className="mt-1">{selectedResponse.completed_by_user.contact_name || 'N/A'}</p>
                      </div>                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="mt-1 flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {selectedResponse.completed_by_user.email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Address Information */}
              {selectedResponse.completed_by_user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Address Line 1</label>
                        <p className="mt-1">{selectedResponse.completed_by_user.address_line1 || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Address Line 2</label>
                        <p className="mt-1">{selectedResponse.completed_by_user.address_line2 || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">City</label>
                        <p className="mt-1">{selectedResponse.completed_by_user.city || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">State</label>
                        <p className="mt-1">{selectedResponse.completed_by_user.state || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Postal Code</label>
                        <p className="mt-1">{selectedResponse.completed_by_user.postal_code || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Country</label>
                        <p className="mt-1">{selectedResponse.completed_by_user.country || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              {selectedResponse.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Uploaded Documents ({selectedResponse.documents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedResponse.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-medium">{doc.file_name}</div>
                              <div className="text-sm text-gray-500">
                                {doc.document_type} • {formatFileSize(doc.file_size)} • {formatDate(doc.uploaded_at)}
                              </div>
                            </div>                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Form Data */}
              {selectedResponse.consent_data.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Submitted Form Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedResponse.consent_data.map((consent, index) => (
                      <div key={consent.id} className="space-y-3">
                        <div className="text-sm text-gray-500">
                          Submitted on {formatDate(consent.submitted_at)}
                        </div>
                        <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                          {JSON.stringify(consent.form_data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
