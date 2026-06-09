'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { PencilLine, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { RequestTemplateRow } from '@/lib/database.types'
import { TemplateSchema, type TemplateFormValues } from '@/lib/validations'
import { countTemplateSelections, fetchRequestTemplates, removeRequestTemplate, saveRequestTemplate } from '@/lib/request-templates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { TemplateSelectionsForm } from '@/components/templates/TemplateSelectionsForm'

interface SavedRequestTemplatesPanelProps {
  onCreateNew: () => void
  onUseTemplate: (templateId: string) => void
}

function templateToForm(template: RequestTemplateRow): TemplateFormValues {
  return {
    name: template.name ?? '',
    mandatory_fields: template.mandatory_fields ?? [],
    optional_fields: template.optional_fields ?? [],
    mandatory_documents: template.mandatory_documents ?? [],
    optional_documents: template.optional_documents ?? [],
  }
}

const emptyTemplate: TemplateFormValues = {
  name: '',
  mandatory_fields: [],
  optional_fields: [],
  mandatory_documents: [],
  optional_documents: [],
}

/**
 * Saved templates panel shown on the Send Requests page for reuse and editing.
 */
export function SavedRequestTemplatesPanel({
  onCreateNew,
  onUseTemplate,
}: SavedRequestTemplatesPanelProps) {
  const queryClient = useQueryClient()
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const { data: templates = [], isLoading } = useQuery<RequestTemplateRow[]>({
    queryKey: ['request-templates'],
    queryFn: fetchRequestTemplates,
  })

  const editingTemplate = useMemo(
    () => templates.find((template) => template.id === editingTemplateId) ?? null,
    [templates, editingTemplateId]
  )

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(TemplateSchema),
    defaultValues: emptyTemplate,
    values: editingTemplate ? templateToForm(editingTemplate) : emptyTemplate,
  })

  const saveMutation = useMutation({
    mutationFn: async (values: TemplateFormValues) => {
      if (!editingTemplate) throw new Error('No template selected')
      return saveRequestTemplate(values, editingTemplate.id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['request-templates'] })
      toast.success('Template updated')
      setEditingTemplateId(null)
    },
    onError: () => {
      toast.error('Failed to update template. Please try again.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (template: RequestTemplateRow) => removeRequestTemplate(template.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['request-templates'] })
      toast.success('Template deleted')
    },
    onError: () => {
      toast.error('Failed to delete template. Please try again.')
    },
  })

  function handleDelete(template: RequestTemplateRow) {
    const confirmed = window.confirm(`Delete template "${template.name}"? This cannot be undone.`)
    if (!confirmed) return
    deleteMutation.mutate(template)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Saved Templates</CardTitle>
            <CardDescription>Reuse, update, or remove request templates from this page.</CardDescription>
          </div>
          <Button onClick={onCreateNew} className="gap-2 sm:self-center">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1].map((index) => <div key={index} className="h-32 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No saved templates yet. Create one from a new request and it will show up here for reuse.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {templates.map((template) => {
                const counts = countTemplateSelections(template)
                return (
                  <div key={template.id} className="rounded-xl border bg-card p-4">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{template.name}</div>
                      <p className="text-sm text-muted-foreground">
                        {counts.fields} fields and {counts.documents} documents
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => onUseTemplate(template.id)}>
                        Use Template
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingTemplateId(template.id)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2"
                        aria-label={`Delete template ${template.name}`}
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4 text-black" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplateId(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilLine className="h-5 w-5 text-blue-600" />
              Edit Template
            </DialogTitle>
            <DialogDescription>Update the template name and selections used on future requests.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Standard vendor review" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <TemplateSelectionsForm form={form} />

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingTemplateId(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
