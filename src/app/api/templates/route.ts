import { requireAppSession } from '@/lib/auth/require-app-session'
import { databaseErrorResponse, rpcErrorResponse } from '@/lib/api-error-response'
import { persistRequestTemplate } from '@/lib/create-request-template'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { TemplateSchema } from '@/lib/validations'

async function requireTemplatesSession() {
  const supabase = await createClient()
  const session = await requireAppSession(supabase)
  if (!session.ok) {
    return { error: session.response }
  }

  return { supabase, user: session.user }
}

/** GET /api/templates — list all templates for the authenticated company */
export async function GET() {
  const auth = await requireTemplatesSession()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (companyError) {
    return databaseErrorResponse('templates.load-company', companyError, 'Failed to load templates.')
  }
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 400 })

  const { data, error } = await supabase
    .from('request_templates')
    .select('*')
    .eq('company_id', company.id)
    .order('name')

  if (error) {
    return databaseErrorResponse('templates.list', error, 'Failed to load templates.')
  }
  return NextResponse.json(data ?? [])
}

/** POST /api/templates — create a new template */
export async function POST(req: Request) {
  const auth = await requireTemplatesSession()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = TemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (companyError) {
    return databaseErrorResponse('templates.create-company', companyError, 'Failed to create template.')
  }
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 400 })

  try {
    const data = await persistRequestTemplate(supabase, company.id, parsed.data)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return rpcErrorResponse('templates.create', error, 'Failed to create template.')
  }
}

/** PUT /api/templates?id=<uuid> — update an existing template */
export async function PUT(req: Request) {
  const auth = await requireTemplatesSession()
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = TemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // RLS ensures only the owning company can update
  const { data, error } = await supabase
    .from('request_templates')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return databaseErrorResponse('templates.update', error, 'Failed to update template.')
  }
  return NextResponse.json(data)
}

/** DELETE /api/templates?id=<uuid> — delete a template */
export async function DELETE(req: Request) {
  const auth = await requireTemplatesSession()
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // RLS ensures only the owning company can delete
  const { error } = await supabase
    .from('request_templates')
    .delete()
    .eq('id', id)

  if (error) {
    return databaseErrorResponse('templates.delete', error, 'Failed to delete template.')
  }
  return new NextResponse(null, { status: 204 })
}
