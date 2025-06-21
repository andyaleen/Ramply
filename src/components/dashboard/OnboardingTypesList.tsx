'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Copy, Calendar, MoreHorizontal } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { SendOnboardingRequestDialog } from './SendOnboardingRequestDialog'
import { EditOnboardingTypeDialog } from './EditOnboardingTypeDialog'
import { DeleteOnboardingTypeDialog } from './DeleteOnboardingTypeDialog'
import { ViewRequestsDialog } from './ViewRequestsDialog'
import { ViewDocumentsDialog } from './ViewDocumentsDialog'
import { toast } from 'sonner'

interface OnboardingTypesListProps {
  mode?: 'manage' | 'send' // 'manage' for Request Types page, 'send' for Send Links page
}

export function OnboardingTypesList({ mode = 'manage' }: OnboardingTypesListProps) {
  const { user } = useAuth()
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRequestsDialog, setShowRequestsDialog] = useState(false)
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false)
  const [selectedTypeName, setSelectedTypeName] = useState<string | null>(null)
  const supabase = createClient()

  const { data: onboardingTypes, isLoading } = useQuery({
    queryKey: ['onboarding-types', user?.id],
    queryFn: async () => {
      if (!user) return []
        const { data, error } = await supabase
        .from('onboarding_types')
        .select(`
          *,
          onboarding_requests(id, status)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data    },
    enabled: !!user,
  })
  
  const handleSendRequest = (typeId: string) => {
    setSelectedTypeId(typeId)
    setShowSendDialog(true)
  }
  const handleEditType = (typeId: string) => {
    setSelectedTypeId(typeId)
    setShowEditDialog(true)
  }
  
  const handleDeleteType = (typeId: string, typeName: string) => {
    setSelectedTypeId(typeId)
    setSelectedTypeName(typeName)
    setShowDeleteDialog(true)
  }


  const handleViewDocuments = (typeId: string, typeName: string) => {
    setSelectedTypeId(typeId)
    setSelectedTypeName(typeName)
    setShowDocumentsDialog(true)
  }
  

  const copyOnboardingLink = async (typeId: string) => {
  const link = `${window.location.origin}/onboard/new?type=${typeId}`;
  try {
    //navigator clipboard only works in secure context localhost/https
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link);
      toast.success('Onboarding link copied to clipboard!');
    } else {
      // Fallback method
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.style.position = "fixed"; // avoid scrolling to bottom
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const success = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (success) {
        toast.success('Onboarding link copied to clipboard!');
      } else {
        toast.error('Failed to copy link. Please copy it manually.');
      }
    }
  } catch (error) {
    console.error('Failed to copy link:', error);
    toast.error('Failed to copy link. Please try again.');
  }
};


  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  if (!onboardingTypes?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {mode === 'send' ? 'No onboarding types available' : 'No onboarding types yet'}
          </h3>
          <p className="text-gray-600 text-center mb-4">
            {mode === 'send' 
              ? 'Create onboarding types first before sending invitations to vendors'
              : 'Create your first onboarding flow to start collecting vendor information'
            }
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {onboardingTypes.map((type) => (
          <Card key={type.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{type.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {type.description || 'No description provided'}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {type.required_documents && type.required_documents.length > 0 && (
                  <Badge variant="outline">
                    {type.required_documents.length} Documents
                  </Badge>
                )}
                {type.required_fields && type.required_fields.length > 0 && (
                  <Badge variant="outline">
                    {type.required_fields.length} Fields
                  </Badge>
                )}
              </div>              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(type.created_at)}
                  </span>
                </div>
              </div><div className="flex gap-2">
                {mode === 'send' ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(type.id)}
                    >
                      Send Invitation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyOnboardingLink(type.id)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Link
                    </Button>
                  </>                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditType(type.id)}
                    >
                      Edit Type
                    </Button>                    {(type.onboarding_requests?.length || 0) > 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDocuments(type.id, type.name)}
                          className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Documents
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyOnboardingLink(type.id)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Preview Link
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteType(type.id, type.name)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>        ))}
      </div>      {mode === 'send' && (
        <SendOnboardingRequestDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          onboardingTypeId={selectedTypeId}
          onSuccess={() => setShowSendDialog(false)}
        />
      )}

      {mode === 'manage' && (
        <>
          <EditOnboardingTypeDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onboardingTypeId={selectedTypeId}
            onSuccess={() => setShowEditDialog(false)}
          />
            <DeleteOnboardingTypeDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onboardingTypeId={selectedTypeId}
            onboardingTypeName={selectedTypeName}
            onSuccess={() => setShowDeleteDialog(false)}
          />
            <ViewRequestsDialog
            open={showRequestsDialog}
            onOpenChange={setShowRequestsDialog}
            onboardingTypeId={selectedTypeId}
            onboardingTypeName={selectedTypeName}
          />
          
          <ViewDocumentsDialog
            open={showDocumentsDialog}
            onOpenChange={setShowDocumentsDialog}
            onboardingTypeId={selectedTypeId}
            onboardingTypeName={selectedTypeName}
          />
        </>
      )}
    </>
  )
}
