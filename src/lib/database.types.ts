export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          company_name: string | null
          contact_name: string | null
          contact_email: string | null
          tax_id: string | null
          business_type: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string | null
          role: 'admin' | 'external'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          company_name?: string | null
          contact_name?: string | null
          contact_email?: string | null
          tax_id?: string | null
          business_type?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          role?: 'admin' | 'external'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          company_name?: string | null
          contact_name?: string | null
          contact_email?: string | null
          tax_id?: string | null
          business_type?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          role?: 'admin' | 'external'
          created_at?: string
          updated_at?: string
        }
      }
      onboarding_types: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          required_fields: any
          required_documents: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          required_fields?: any
          required_documents?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          required_fields?: any
          required_documents?: any
          created_at?: string
          updated_at?: string
        }
      }
      onboarding_requests: {
        Row: {
          id: string
          onboarding_type_id: string
          requester_user_id: string
          token: string
          recipient_email: string
          expires_at: string | null
          status: 'pending' | 'completed' | 'expired'
          completed_by: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          onboarding_type_id: string
          requester_user_id: string
          token: string
          recipient_email: string
          expires_at?: string | null
          status?: 'pending' | 'completed' | 'expired'
          completed_by?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          onboarding_type_id?: string
          requester_user_id?: string
          token?: string
          recipient_email?: string
          expires_at?: string | null
          status?: 'pending' | 'completed' | 'expired'
          completed_by?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          request_id: string
          document_type: string
          file_path: string
          file_name: string
          file_size: number | null
          mime_type: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          request_id: string
          document_type: string
          file_path: string
          file_name: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          request_id?: string
          document_type?: string
          file_path?: string
          file_name?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_at?: string
        }
      }
      onboarding_consent: {
        Row: {
          id: string
          user_id: string
          request_id: string
          document_type: string
          shared_at: string
        }
        Insert: {
          id?: string
          user_id: string
          request_id: string
          document_type: string
          shared_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          request_id?: string
          document_type?: string
          shared_at?: string
        }
      }
    }
  }
}
