export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string
          name: string
          display_name: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          display_order: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          display_order?: number
          created_at?: string
        }
        Relationships: []
      }
      no_dues_forms: {
        Row: {
          id: string
          user_id: string
          student_name: string
          registration_no: string
          session_from: string | null
          session_to: string | null
          parent_name: string | null
          school: string
          course: string | null
          branch: string | null
          contact_no: string | null
          alumni_screenshot_url: string | null
          certificate_url: string | null
          final_certificate_generated: boolean
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          student_name: string
          registration_no: string
          session_from?: string | null
          session_to?: string | null
          parent_name?: string | null
          school?: string
          course?: string | null
          branch?: string | null
          contact_no?: string | null
          alumni_screenshot_url?: string | null
          certificate_url?: string | null
          final_certificate_generated?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          student_name?: string
          registration_no?: string
          session_from?: string | null
          session_to?: string | null
          parent_name?: string | null
          school?: string
          course?: string | null
          branch?: string | null
          contact_no?: string | null
          alumni_screenshot_url?: string | null
          certificate_url?: string | null
          final_certificate_generated?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "no_dues_forms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      no_dues_status: {
        Row: {
          id: string
          form_id: string
          department_name: string
          status: string
          action_by_user_id: string | null
          action_at: string | null
          rejection_reason: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          department_name: string
          status?: string
          action_by_user_id?: string | null
          action_at?: string | null
          rejection_reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          department_name?: string
          status?: string
          action_by_user_id?: string | null
          action_at?: string | null
          rejection_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "no_dues_status_action_by_user_id_fkey"
            columns: ["action_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_dues_status_department_name_fkey"
            columns: ["department_name"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "no_dues_status_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "no_dues_forms"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          role: string
          department_name: string | null
          registration_no: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: string
          department_name?: string | null
          registration_no?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: string
          department_name?: string | null
          registration_no?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}