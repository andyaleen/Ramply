'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, FileText, Edit } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingTypeSchema, DOCUMENT_TYPES, FIELD_TYPES } from '@/lib/validations'
import { toast } from 'sonner'

interface EditOnboardingTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onboardingTypeId: string | null
  onSuccess: () => void
}

export function EditOnboardingTypeDialog({
  open,
  onOpenChange,
  onboardingTypeId,
  onSuccess,
}: EditOnboardingTypeDialogProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(OnboardingTypeSchema.omit({ required_fields: true, required_documents: true })),
  })

  // Load existing data when dialog opens
  useEffect(() => {
    if (open && onboardingTypeId) {
      loadOnboardingType()
    }
  }, [open, onboardingTypeId])

  const loadOnboardingType = async () => {
    if (!onboardingTypeId) return
    
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('onboarding_types')
        .select('*')
        .eq('id', onboardingTypeId)
        .single()

      if (error) throw error

      setValue('name', data.name)
      setValue('description', data.description || '')
      setSelectedDocuments(data.required_documents || [])
      setSelectedFields(data.required_fields || [])
    } catch (error) {
      console.error('Error loading onboarding type:', error)
      toast.error('Failed to load onboarding type data')
    } finally {
      setIsLoading(false)
    }
  }
  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      console.log('Starting mutation with:', { data, selectedDocuments, selectedFields })
      
      if (!user || !onboardingTypeId) {
        console.error('Missing requirements:', { user: !!user, onboardingTypeId })
        throw new Error('Missing user or type ID')
      }

      const updateData = {
        name: data.name,
        description: data.description,
        required_documents: selectedDocuments,
        required_fields: selectedFields,
        updated_at: new Date().toISOString(),
      }
      
      console.log('Updating with data:', updateData)

      const { error } = await supabase
        .from('onboarding_types')
        .update(updateData)
        .eq('id', onboardingTypeId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Update successful')
    },
    onSuccess: () => {
      console.log('Mutation succeeded')
      queryClient.invalidateQueries({ queryKey: ['onboarding-types'] })
      reset()
      setSelectedDocuments([])
      setSelectedFields([])
      toast.success('Onboarding type updated successfully!')
      onSuccess()
    },
    onError: (error) => {
      console.error('Mutation error:', error)
      toast.error('Failed to update onboarding type. Please try again.')
    },
  })
  const handleManualSubmit = () => {
    console.log('Manual submit triggered')
    const form = document.getElementById('edit-onboarding-form') as HTMLFormElement
    if (form) {
      console.log('Form found, triggering submit')
      form.requestSubmit()
    } else {
      console.error('Form not found')
      // Fallback: get form values and submit directly
      const nameElement = document.getElementById('name') as HTMLInputElement
      const descriptionElement = document.getElementById('description') as HTMLTextAreaElement
      
      if (nameElement) {
        const formData = {
          name: nameElement.value,
          description: descriptionElement?.value || ''
        }
        console.log('Manual form data:', formData)
        onSubmit(formData)
      }
    }
  }

  const onSubmit = (data: { name: string; description?: string }) => {
    console.log('Form submitted with data:', data)
    console.log('Selected documents:', selectedDocuments)
    console.log('Selected fields:', selectedFields)
    
    if (!user) {
      console.error('No user found')
      toast.error('User not authenticated')
      return
    }
    
    if (!onboardingTypeId) {
      console.error('No onboarding type ID found')
      toast.error('Onboarding type ID missing')
      return
    }
    
    updateMutation.mutate(data)
  }

  const toggleDocument = (document: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(document)
        ? prev.filter((d) => d !== document)
        : [...prev, document]
    )
  }

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    )
  }

  const handleClose = () => {
    reset()
    setSelectedDocuments([])
    setSelectedFields([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Onboarding Type
          </DialogTitle>
          <DialogDescription>
            Update the onboarding workflow requirements and settings.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (          <form 
            onSubmit={(e) => {
              console.log('Form onSubmit triggered with event:', e)
              handleSubmit(onSubmit)(e)
            }} 
            className="space-y-6" 
            id="edit-onboarding-form"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Vendor Onboarding"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.name.message as string}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this onboarding process is for..."
                  rows={3}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.description.message as string}
                  </p>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Required Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {DOCUMENT_TYPES.map((document) => (
                    <div key={document} className="flex items-center space-x-2">
                      <Checkbox
                        id={`doc-${document}`}
                        checked={selectedDocuments.includes(document)}
                        onCheckedChange={() => toggleDocument(document)}
                      />
                      <Label
                        htmlFor={`doc-${document}`}
                        className="text-sm font-normal"
                      >
                        {document}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Required Fields
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {FIELD_TYPES.map((field) => (
                    <div key={field} className="flex items-center space-x-2">
                      <Checkbox
                        id={`field-${field}`}
                        checked={selectedFields.includes(field)}
                        onCheckedChange={() => toggleField(field)}
                      />
                      <Label
                        htmlFor={`field-${field}`}
                        className="text-sm font-normal"
                      >
                        {field}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>              <Button
                type="submit"
                form="edit-onboarding-form"
                disabled={updateMutation.isPending}
                onClick={(e) => {
                  console.log('Submit button clicked - event:', e)
                  console.log('Form element:', document.getElementById('edit-onboarding-form'))
                  console.log('User:', user)
                  console.log('Onboarding Type ID:', onboardingTypeId)
                  
                  // Try manual submit as fallback
                  setTimeout(() => {
                    console.log('Checking if form submitted naturally...')
                    handleManualSubmit()
                  }, 100)
                }}
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Type'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
