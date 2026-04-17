'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookTemplate } from 'lucide-react'
import { TemplatesManager } from '@/components/templates/TemplatesManager'

/** Admin page for managing request templates. */
export default function TemplatesPage() {
  const router = useRouter()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Button>
        <BookTemplate className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Request Templates</h1>
          <p className="text-gray-600">Create reusable bundles of fields and documents</p>
        </div>
      </div>

      <TemplatesManager />
    </div>
  )
}
