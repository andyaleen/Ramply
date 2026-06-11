'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { BookTemplate, Plus, Save, Trash2 } from 'lucide-react'
import { TemplateSchema, type TemplateFormValues } from '@/lib/validations'
import type { RequestTemplateRow } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'
import {
  countTemplateSelections,
  fetchRequestTemplates,
  removeRequestTemplate,
  requestTemplatesQueryKey,
  saveRequestTemplate,
} from '@/lib/request-templates'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { TemplateSelectionsForm } from '@/components/templates/TemplateSelectionsForm'

const emptyTemplate: TemplateFormValues = {
  name: '',
  mandatory_fields: [],
  optional_fields: [],
  mandatory_documents: [],
  optional_documents: [],
}

/** Normalize a template row into form values. */
function templateToForm(template: RequestTemplateRow): TemplateFormValues {
  return {
    name: template.name ?? '',
    mandatory_fields: template.mandatory_fields ?? [],
    optional_fields: template.optional_fields ?? [],
    mandatory_documents: template.mandatory_documents ?? [],
    optional_documents: template.optional_documents ?? [],
  }
}

/** Templates manager UI for creating and editing request templates. */
export function TemplatesManager() {
  const { company } = useAuth()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'new' | 'edit'>('edit')
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const templatesQueryKey = requestTemplatesQueryKey(company?.id)

  const { data: templates = [], isLoading } = useQuery<RequestTemplateRow[]>({
    queryKey: templatesQueryKey,
    queryFn: fetchRequestTemplates,
    enabled: !!company?.id,
  })

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) ?? null,
    [templates, activeTemplateId]
  )

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(TemplateSchema),
    defaultValues: emptyTemplate,
  })

  /** Select an existing template for editing. */
  function selectTemplate(templateId: string) {
    setMode('edit')
    setActiveTemplateId(templateId)
  }

  /** Start a new template draft. */
  function startNewTemplate() {
    setMode('new')
    setActiveTemplateId(null)
    form.reset(emptyTemplate)
  }

  useEffect(() => {
    if (mode === 'edit' && !activeTemplateId && templates.length > 0) {
      setActiveTemplateId(templates[0].id)
    }
    if (templates.length === 0) {
      setMode('new')
      setActiveTemplateId(null)
    }
  }, [templates, mode, activeTemplateId])

  useEffect(() => {
    if (mode === 'edit' && activeTemplate) {
      form.reset(templateToForm(activeTemplate))
    }
    if (mode === 'new') {
      form.reset(emptyTemplate)
    }
  }, [mode, activeTemplate, form])

  const saveMutation = useMutation({
    mutationFn: async (values: TemplateFormValues) => {
      return saveRequestTemplate(values, mode === 'edit' ? activeTemplate?.id : undefined)
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: templatesQueryKey })
      setMode('edit')
      setActiveTemplateId(data.id)
      toast.success('Template saved')
    },
    onError: () => {
      toast.error('Failed to save template. Please try again.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (template: RequestTemplateRow) => {
      await removeRequestTemplate(template.id)
      return template.id
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: templatesQueryKey })
      toast.success('Template deleted')
    },
    onError: () => {
      toast.error('Failed to delete template. Please try again.')
    },
  })

  /** Delete the active template after confirmation. */
  function handleDelete(template: RequestTemplateRow) {
    const confirmed = window.confirm(`Delete template "${template.name}"? This cannot be undone.`)
    if (!confirmed) return
    deleteMutation.mutate(template)
  }

  /** Save the current form values as a new or updated template. */
  function handleSave(values: TemplateFormValues) {
    saveMutation.mutate(values)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-blue-600" />
            Templates
          </CardTitle>
          <CardDescription>Create reusable bundles for share requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={startNewTemplate} className="w-full gap-2" variant="secondary">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
          <Separator />
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 w-full animate-pulse rounded bg-muted" />
              <div className="h-8 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet. Create your first one.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => {
                const counts = countTemplateSelections(template)
                const isActive = template.id === activeTemplateId && mode === 'edit'
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template.id)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-left text-sm transition',
                      isActive ? 'border-blue-500 bg-blue-50' : 'hover:bg-muted'
                    )}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {counts.fields} fields, {counts.documents} documents
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{mode === 'new' ? 'New Template' : 'Edit Template'}</CardTitle>
          <CardDescription>
            {mode === 'new'
              ? 'Pick fields and documents to reuse later.'
              : 'Update the template name and selections.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Vendor onboarding basics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <TemplateSelectionsForm form={form} />

              <div className="flex flex-wrap items-center gap-2">
                {mode === 'edit' && activeTemplate ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDelete(activeTemplate)}
                    disabled={deleteMutation.isPending}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
                <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Template'}
                </Button>
                {form.formState.isDirty && (
                  <span className="text-xs text-muted-foreground">Unsaved changes</span>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
