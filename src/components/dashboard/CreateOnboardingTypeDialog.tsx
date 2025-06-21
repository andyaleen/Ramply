'use client'

import { useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingTypeSchema, DOCUMENT_TYPES, FIELD_TYPES, type OnboardingType } from '@/lib/validations'
import { FileText, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface CreateOnboardingTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateOnboardingTypeDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOnboardingTypeDialogProps) {
  const { user, isAdmin } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  console.log("Current user:", user, "Is admin:", isAdmin)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(OnboardingTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      required_fields: [],
      required_documents: [],
    },
  })
  const createMutation = useMutation({
    mutationFn: async (data: OnboardingType) => {
      const { error } = await supabase
        .from('onboarding_types')
        .insert([
          {
            ...data,
            user_id: user?.id,
            required_documents: selectedDocuments,
            required_fields: selectedFields,
          },
        ])

      if (error) throw error
    },
    onSuccess: () => {
      console.log('Mutation success')
      queryClient.invalidateQueries({ queryKey: ['onboarding-types'] })
      reset()
      setSelectedDocuments([])
      setSelectedFields([])
      toast.success('Onboarding type created successfully!')
      onSuccess()
    },
    onError: (error) => {
      console.error('Error creating onboarding type:', error)
      toast.error('Failed to create onboarding type. Please try again.')
    },
  })

  const onSubmit = (data: OnboardingType) => {
    if (!user) return
    createMutation.mutate(data)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Onboarding Flow
          </DialogTitle>
          <DialogDescription>
            Define a new onboarding workflow with required fields and documents.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Flow Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., 1099 Setup, Vendor Onboarding"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of this onboarding flow..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Required Documents */}
          <Card>
            <CardHeader className="pb-3">
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
                      className="text-sm font-normal cursor-pointer"
                    >
                      {document}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Required Fields */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Required Information Fields
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
                      className="text-sm font-normal cursor-pointer"
                    >
                      {field}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Onboarding Flow'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
