'use client'

import type { RequestTemplateRow } from '@/lib/database.types'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookTemplate, Trash2 } from 'lucide-react'

interface TemplatePickerProps {
  templates: RequestTemplateRow[]
  onApply: (template: RequestTemplateRow) => void
  onDelete: (template: RequestTemplateRow) => void
}

/** Dropdown and quick-delete UI for applying request templates. */
export function TemplatePicker({ templates, onApply, onDelete }: TemplatePickerProps) {
  if (templates.length === 0) return null

  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-1 text-xs text-muted-foreground">
        <BookTemplate className="h-3 w-3" />
        Load a template
      </Label>
      <div className="flex gap-2">
        <Select onValueChange={(id) => {
          const template = templates.find(t => t.id === id)
          if (template) onApply(template)
        }}>
          <SelectTrigger className="flex-1 text-sm">
            <SelectValue placeholder="Choose a template..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center justify-between w-full gap-8">
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {templates.map(t => (
          <span key={t.id} className="inline-flex items-center gap-1 text-xs bg-muted rounded px-2 py-0.5">
            {t.name}
            <button
              type="button"
              onClick={() => onDelete(t)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
