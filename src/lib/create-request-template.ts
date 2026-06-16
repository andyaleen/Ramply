import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { RequestTemplateRow } from '@/lib/database.types'
import type { TemplateFormValues } from '@/lib/validations'

/** True when the create_request_template RPC has not been deployed yet. */
export function isMissingCreateTemplateRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST202') return true
  return /create_request_template/i.test(error.message ?? '')
}

function isRequestTemplateRow(value: unknown): value is RequestTemplateRow {
  return (
    typeof value === 'object'
    && value !== null
    && 'id' in value
    && 'name' in value
    && 'company_id' in value
  )
}

/** Create a request template through the Supabase RPC when available. */
export async function createRequestTemplateViaRpc(
  supabase: SupabaseClient,
  values: TemplateFormValues
): Promise<RequestTemplateRow> {
  const { data, error } = await supabase.rpc('create_request_template', {
    p_name: values.name,
    p_mandatory_fields: values.mandatory_fields,
    p_optional_fields: values.optional_fields,
    p_mandatory_documents: values.mandatory_documents,
    p_optional_documents: values.optional_documents,
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!isRequestTemplateRow(row)) {
    throw new Error('rpc_invalid_response')
  }

  return row
}

/** Direct insert fallback for environments without the create_request_template RPC. */
export async function createRequestTemplateDirect(
  supabase: SupabaseClient,
  companyId: string,
  values: TemplateFormValues
): Promise<RequestTemplateRow> {
  const { data, error } = await supabase
    .from('request_templates')
    .insert({
      company_id: companyId,
      public_token: randomBytes(16).toString('hex'),
      ...values,
    })
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('insert_failed')
  return data
}

/** Create a template via RPC first, then fall back to a direct insert. */
export async function persistRequestTemplate(
  supabase: SupabaseClient,
  companyId: string,
  values: TemplateFormValues
): Promise<RequestTemplateRow> {
  try {
    return await createRequestTemplateViaRpc(supabase, values)
  } catch (rpcError) {
    if (!isMissingCreateTemplateRpc(rpcError as { code?: string; message?: string })) {
      throw rpcError
    }
  }

  return createRequestTemplateDirect(supabase, companyId, values)
}
