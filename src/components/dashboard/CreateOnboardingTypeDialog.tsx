'use client'

import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { OnboardingTypeSchema, type OnboardingType, DOCUMENT_TYPES, FIELD_TYPES } from '@/lib/validations'
import { X, Plus } from 'lucide-react'

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
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OnboardingType>({
    resolver: zodResolver(OnboardingTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      required_fields: [],
      required_documents: [],
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: OnboardingType & { user_id: string }) => {
      const { error } = await supabase
        .from('onboarding_types')
        .insert([{
          ...data,
          required_documents: selectedDocuments,
          required_fields: selectedFields,
        }])

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-types'] })
      reset()
      setSelectedDocuments([])
      setSelectedFields([])
      onSuccess()
    },
  })

  const onSubmit = (data: OnboardingType) => {
    if (!user) return
    createMutation.mutate({ ...data, user_id: user.id })
  }

  const toggleDocument = (document: string) => {
    setSelectedDocuments(prev =>
      prev.includes(document)
        ? prev.filter(d => d !== document)
        : [...prev, document]
    )
  }

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Onboarding Type</DialogTitle>
          <DialogDescription>
            Define what information and documents you need from vendors or customers
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., 1099 Vendor Onboarding"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe what this onboarding flow is for..."
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Required Documents</Label>
              <p className="text-sm text-gray-600">
                Select the documents that vendors need to provide
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DOCUMENT_TYPES.map((document) => (
                  <button
                    key={document}
                    type="button"
                    onClick={() => toggleDocument(document)}
                    className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                      selectedDocuments.includes(document)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{document}</span>
                      {selectedDocuments.includes(document) && (
                        <Plus className="h-4 w-4 rotate-45" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {selectedDocuments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedDocuments.map((document) => (
                    <Badge key={document} variant="outline" className="flex items-center gap-1">
                      {document}
                      <button
                        type="button"
                        onClick={() => toggleDocument(document)}
                        className="ml-1 hover:bg-red-100 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Required Information Fields</Label>
              <p className="text-sm text-gray-600">
                Select the types of information you need to collect
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FIELD_TYPES.map((field) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => toggleField(field)}
                    className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                      selectedFields.includes(field)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{field}</span>
                      {selectedFields.includes(field) && (
                        <Plus className="h-4 w-4 rotate-45" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {selectedFields.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedFields.map((field) => (
                    <Badge key={field} variant="outline" className="flex items-center gap-1">
                      {field}
                      <button
                        type="button"
                        onClick={() => toggleField(field)}
                        className="ml-1 hover:bg-red-100 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Onboarding Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
