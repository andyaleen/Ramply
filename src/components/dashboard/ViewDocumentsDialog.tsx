'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Download, User } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { downloadDocument } from '@/lib/file-utils'

interface ViewDocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onboardingTypeId: string | null
  onboardingTypeName: string | null
}

interface DocumentWithUser {
  id: string
  user_id: string
  request_id: string
  document_type: string
  file_path: string
  file_name: string
  file_size: number | null
  uploaded_at: string
  user: {
    id: string
    email: string
    full_name: string | null
  } | null
  request: {
    id: string
    recipient_email: string
    status: string
    completed_at: string | null
  } | null
}

export function ViewDocumentsDialog({
  open,
  onOpenChange,
  onboardingTypeId,
  onboardingTypeName
}: ViewDocumentsDialogProps) {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: documentsWithUsers, isLoading, error } = useQuery({
    queryKey: ['documents-with-users', onboardingTypeId],
    queryFn: async () => {
      try {
        console.log("📥 Query running...");

        if (!user || !onboardingTypeId) {
          console.warn('❌ Missing user or onboardingTypeId');
          return [];
        }

        // Check if user owns this onboarding type
        const { data: onboardingType, error: typeError } = await supabase
          .from('onboarding_types')
          .select('id, name, user_id')
          .eq('id', onboardingTypeId)
          .eq('user_id', user.id)
          .single();

        if (typeError || !onboardingType) {
          console.error('❌ Error fetching onboarding type or not owned by user:', typeError);
          throw new Error('You do not have permission to view documents for this onboarding type');
        }

        // Fetch requests
        const { data: requests, error: requestsError } = await supabase
          .from('onboarding_requests')
          .select('id, recipient_email, status, completed_at')
          .eq('onboarding_type_id', onboardingTypeId);

        if (requestsError) {
          console.error('❌ Error fetching requests:', requestsError);
          throw requestsError;
        }

        if (!requests?.length) return [];

        const requestIds = requests.map(req => req.id);

        // Fetch documents for requests
        const { data: documents, error: documentsError } = await supabase
          .from('documents')
          .select('id, user_id, request_id, document_type, file_path, file_name, file_size, uploaded_at')
          .in('request_id', requestIds)
          .order('uploaded_at', { ascending: false });

        if (documentsError) {
          console.error('❌ Error fetching documents:', documentsError);
          throw documentsError;
        }

        if (!documents?.length) return [];

        // Fetch users
        const userIds = [...new Set(documents.map(doc => doc.user_id))];
        let users: any[] = [];

        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, email, contact_name')
            .in('id', userIds);

            console.log("users ", userIds, "userdata ", usersData);
            console.log("usersError:", usersError);

          if (usersError) {
            console.error('❌ Error fetching users:', usersError);
          } else {
            users = usersData || [];
          }
        }
        
        const userMap = new Map();
        users.forEach(u => {
          userMap.set(u.id, {
            id: u.id,
            email: u.email,
            full_name: u.contact_name || null
          });
        });

        const requestMap = new Map();
        requests.forEach(req => {
          requestMap.set(req.id, req);
        });

        const documentsWithUsers: DocumentWithUser[] = documents.map(doc => ({
          ...doc,
          user: userMap.get(doc.user_id) || null,
          request: requestMap.get(doc.request_id) || null
        }));

        console.log('✅ Final document count:', documentsWithUsers.length);

        return documentsWithUsers;
      } catch (error) {
        console.error("🚨 useQuery error:", error);
        throw error; // <== make sure to re-throw so React Query knows it's an error
      }
    },
    enabled: !!user && !!onboardingTypeId && open,
  });


  const handleDownloadDocument = async (doc: DocumentWithUser) => {
    await downloadDocument({
      file_path: doc.file_path,
      file_name: doc.file_name,
      document_type: doc.document_type
    })
  }

  // console.log("view-documents-dialog.tsx - documentsWithUsers:", documentsWithUsers)

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Documents - {onboardingTypeName}</DialogTitle>
            <DialogDescription>
              Loading documents for this onboarding type...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Documents - {onboardingTypeName}</DialogTitle>
            <DialogDescription>
              Error loading documents for this onboarding type
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-red-600">Failed to load documents. Please try again.</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!documentsWithUsers || documentsWithUsers.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Documents - {onboardingTypeName}</DialogTitle>
            <DialogDescription>
              All documents uploaded for this onboarding type
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No documents have been uploaded for this onboarding type yet.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
  // console.log('📄 Documents with users:', documentsWithUsers)
  // Group documents by user
  const documentsByUser = documentsWithUsers.reduce((acc, doc) => {
    const userKey = doc.user?.email || 'Unknown User'
    if (!acc[userKey]) {
      acc[userKey] = []
    }
    acc[userKey].push(doc)
    return acc
  }, {} as Record<string, DocumentWithUser[]>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Documents - {onboardingTypeName}</DialogTitle>
          <DialogDescription>
            All documents uploaded for this onboarding type ({documentsWithUsers.length} total)
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          <div className="space-y-6">
            {Object.entries(documentsByUser).map(([userEmail, userDocs]) => (
              <Card key={userEmail}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {userDocs[0]?.user?.full_name || userEmail}
                    <Badge variant="secondary" className="ml-2">
                      {userDocs.length} document{userDocs.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                  <div className="text-sm text-gray-500">
                    Email: {userEmail}
                    {userDocs[0]?.request && (
                      <span className="ml-4">
                        Status: <Badge variant={userDocs[0].request.status === 'completed' ? 'default' : 'secondary'}>
                          {userDocs[0].request.status}
                        </Badge>
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document Type</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userDocs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <Badge variant="outline">{doc.document_type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{doc.file_name}</TableCell>
                          <TableCell>
                            {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                          </TableCell>
                          <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc)}
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
