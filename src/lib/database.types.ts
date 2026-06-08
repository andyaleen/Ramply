import type { FieldKey, DocumentTypeKey } from './catalog'

export interface NotificationPreferences {
  email_notifications?: boolean
  request_updates?: boolean
  vendor_completions?: boolean
  system_updates?: boolean
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'external'
          notification_preferences: NotificationPreferences
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'admin' | 'external'
          notification_preferences?: NotificationPreferences
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'external'
          notification_preferences?: NotificationPreferences
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          owner_user_id: string
          legal_name: string | null
          dba_name: string | null
          ein: string | null
          business_type: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_routing_number: string | null
          website: string | null
          year_founded: string | null
          accounting_name: string | null
          accounting_email: string | null
          accounting_phone: string | null
          bank_reference_email: string | null
          vendor_references: string | null
          payment_terms: string | null
          payment_method: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_price_id: string | null
          subscription_current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          legal_name?: string | null
          dba_name?: string | null
          ein?: string | null
          business_type?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_routing_number?: string | null
          website?: string | null
          year_founded?: string | null
          accounting_name?: string | null
          accounting_email?: string | null
          accounting_phone?: string | null
          bank_reference_email?: string | null
          vendor_references?: string | null
          payment_terms?: string | null
          payment_method?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_price_id?: string | null
          subscription_current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          legal_name?: string | null
          dba_name?: string | null
          ein?: string | null
          business_type?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_routing_number?: string | null
          website?: string | null
          year_founded?: string | null
          accounting_name?: string | null
          accounting_email?: string | null
          accounting_phone?: string | null
          bank_reference_email?: string | null
          vendor_references?: string | null
          payment_terms?: string | null
          payment_method?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_price_id?: string | null
          subscription_current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      company_documents: {
        Row: {
          id: string
          company_id: string
          document_type: DocumentTypeKey
          file_path: string
          file_name: string
          file_size: number | null
          mime_type: string | null
          file_hash: string | null
          version: number
          superseded_by: string | null
          uploaded_at: string
          extracted_fields: Record<string, unknown>
          approved_fields: Record<string, unknown> | null
          approved_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          document_type: DocumentTypeKey
          file_path: string
          file_name: string
          file_size?: number | null
          mime_type?: string | null
          file_hash?: string | null
          version?: number
          superseded_by?: string | null
          uploaded_at?: string
          extracted_fields?: Record<string, unknown>
          approved_fields?: Record<string, unknown> | null
          approved_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          document_type?: DocumentTypeKey
          file_path?: string
          file_name?: string
          file_size?: number | null
          mime_type?: string | null
          file_hash?: string | null
          version?: number
          superseded_by?: string | null
          uploaded_at?: string
          extracted_fields?: Record<string, unknown>
          approved_fields?: Record<string, unknown> | null
          approved_at?: string | null
        }
      }
      document_extractions: {
        Row: {
          id: string
          company_id: string
          company_document_id: string
          provider: string
          status: 'pending' | 'succeeded' | 'failed'
          raw_text: string | null
          structured_data: Record<string, unknown>
          metadata: Record<string, unknown> | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          company_document_id: string
          provider: string
          status?: 'pending' | 'succeeded' | 'failed'
          raw_text?: string | null
          structured_data?: Record<string, unknown>
          metadata?: Record<string, unknown> | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          company_document_id?: string
          provider?: string
          status?: 'pending' | 'succeeded' | 'failed'
          raw_text?: string | null
          structured_data?: Record<string, unknown>
          metadata?: Record<string, unknown> | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      request_templates: {
        Row: {
          id: string
          company_id: string
          name: string
          mandatory_fields: FieldKey[]
          mandatory_documents: DocumentTypeKey[]
          optional_fields: FieldKey[]
          optional_documents: DocumentTypeKey[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          mandatory_fields?: FieldKey[]
          mandatory_documents?: DocumentTypeKey[]
          optional_fields?: FieldKey[]
          optional_documents?: DocumentTypeKey[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          mandatory_fields?: FieldKey[]
          mandatory_documents?: DocumentTypeKey[]
          optional_fields?: FieldKey[]
          optional_documents?: DocumentTypeKey[]
          created_at?: string
          updated_at?: string
        }
      }
      share_requests: {
        Row: {
          id: string
          requester_company_id: string
          request_type: string
          recipient_email: string | null
          mandatory_fields: FieldKey[]
          mandatory_documents: DocumentTypeKey[]
          optional_fields: FieldKey[]
          optional_documents: DocumentTypeKey[]
          token: string
          expires_at: string | null
          status: 'pending' | 'completed' | 'expired' | 'denied'
          completed_by_company_id: string | null
          completed_at: string | null
          denied_at: string | null
          denied_by_company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_company_id: string
          request_type: string
          recipient_email?: string | null
          mandatory_fields?: FieldKey[]
          mandatory_documents?: DocumentTypeKey[]
          optional_fields?: FieldKey[]
          optional_documents?: DocumentTypeKey[]
          token: string
          expires_at?: string | null
          status?: 'pending' | 'completed' | 'expired' | 'denied'
          completed_by_company_id?: string | null
          completed_at?: string | null
          denied_at?: string | null
          denied_by_company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_company_id?: string
          request_type?: string
          recipient_email?: string | null
          mandatory_fields?: FieldKey[]
          mandatory_documents?: DocumentTypeKey[]
          optional_fields?: FieldKey[]
          optional_documents?: DocumentTypeKey[]
          token?: string
          expires_at?: string | null
          status?: 'pending' | 'completed' | 'expired' | 'denied'
          completed_by_company_id?: string | null
          completed_at?: string | null
          denied_at?: string | null
          denied_by_company_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shared_data: {
        Row: {
          id: string
          share_request_id: string
          sharing_company_id: string
          field_data: Partial<Record<FieldKey, string>>
          shared_at: string
        }
        Insert: {
          id?: string
          share_request_id: string
          sharing_company_id: string
          field_data?: Partial<Record<FieldKey, string>>
          shared_at?: string
        }
        Update: {
          id?: string
          share_request_id?: string
          sharing_company_id?: string
          field_data?: Partial<Record<FieldKey, string>>
          shared_at?: string
        }
      }
      shared_documents: {
        Row: {
          id: string
          share_request_id: string
          company_document_id: string
          shared_at: string
        }
        Insert: {
          id?: string
          share_request_id: string
          company_document_id: string
          shared_at?: string
        }
        Update: {
          id?: string
          share_request_id?: string
          company_document_id?: string
          shared_at?: string
        }
      }
    }
  }
}

// Convenience row types
export type UserRow = Database['public']['Tables']['users']['Row']
export type CompanyRow = Database['public']['Tables']['companies']['Row']
export type CompanyDocumentRow = Database['public']['Tables']['company_documents']['Row']
export type DocumentExtractionRow = Database['public']['Tables']['document_extractions']['Row']
export type ShareRequestRow = Database['public']['Tables']['share_requests']['Row']
export type SharedDataRow = Database['public']['Tables']['shared_data']['Row']
export type SharedDocumentRow = Database['public']['Tables']['shared_documents']['Row']
export type RequestTemplateRow = Database['public']['Tables']['request_templates']['Row']
