export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_credentials: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          locked_until: string | null
          login_attempts: number | null
          password_hash: string
          salt: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_hash: string
          salt: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_hash?: string
          salt?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blacklist_entries: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          evidence: Json | null
          id: string
          is_active: boolean | null
          reason: string
          reported_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"] | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          evidence?: Json | null
          id?: string
          is_active?: boolean | null
          reason: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"] | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          evidence?: Json | null
          id?: string
          is_active?: boolean | null
          reason?: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"] | null
        }
        Relationships: []
      }
      bulk_upload_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_log: Json | null
          failed_records: number | null
          file_name: string
          id: string
          institution_id: string | null
          processed_records: number | null
          status: string | null
          successful_records: number | null
          total_records: number
          uploaded_by: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          failed_records?: number | null
          file_name: string
          id?: string
          institution_id?: string | null
          processed_records?: number | null
          status?: string | null
          successful_records?: number | null
          total_records: number
          uploaded_by: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          failed_records?: number | null
          file_name?: string
          id?: string
          institution_id?: string | null
          processed_records?: number | null
          status?: string | null
          successful_records?: number | null
          total_records?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_upload_sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          blockchain_hash: string | null
          certificate_id: string
          certificates: string | null
          "certificates-upload": string | null
          course: string
          created_at: string | null
          digital_signature: string | null
          file_url: string | null
          grade: string | null
          graduation_date: string | null
          id: string
          institution_id: string | null
          is_legacy: boolean | null
          issue_date: string
          ocr_extracted_data: Json | null
          status: Database["public"]["Enums"]["certificate_status"] | null
          student_name: string
          thumbnail_url: string | null
          updated_at: string | null
          uploaded_by: string | null
          verification_method:
            | Database["public"]["Enums"]["verification_method"][]
            | null
          watermark_data: Json | null
        }
        Insert: {
          blockchain_hash?: string | null
          certificate_id: string
          certificates?: string | null
          "certificates-upload"?: string | null
          course: string
          created_at?: string | null
          digital_signature?: string | null
          file_url?: string | null
          grade?: string | null
          graduation_date?: string | null
          id?: string
          institution_id?: string | null
          is_legacy?: boolean | null
          issue_date: string
          ocr_extracted_data?: Json | null
          status?: Database["public"]["Enums"]["certificate_status"] | null
          student_name: string
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          verification_method?:
            | Database["public"]["Enums"]["verification_method"][]
            | null
          watermark_data?: Json | null
        }
        Update: {
          blockchain_hash?: string | null
          certificate_id?: string
          certificates?: string | null
          "certificates-upload"?: string | null
          course?: string
          created_at?: string | null
          digital_signature?: string | null
          file_url?: string | null
          grade?: string | null
          graduation_date?: string | null
          id?: string
          institution_id?: string | null
          is_legacy?: boolean | null
          issue_date?: string
          ocr_extracted_data?: Json | null
          status?: Database["public"]["Enums"]["certificate_status"] | null
          student_name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          verification_method?:
            | Database["public"]["Enums"]["verification_method"][]
            | null
          watermark_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          created_at: string | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id: string
          institution_id: string
          upload_status: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          institution_id: string
          upload_status?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          institution_id?: string
          upload_status?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      flagged_certificates: {
        Row: {
          certificate_id: string
          created_at: string
          evidence: Json | null
          id: string
          institution: string | null
          is_active: boolean
          reason: string
          report_count: number
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          certificate_id: string
          created_at?: string
          evidence?: Json | null
          id?: string
          institution?: string | null
          is_active?: boolean
          reason: string
          report_count?: number
          severity: string
          status?: string
          updated_at?: string
        }
        Update: {
          certificate_id?: string
          created_at?: string
          evidence?: Json | null
          id?: string
          institution?: string | null
          is_active?: boolean
          reason?: string
          report_count?: number
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      forgery_reports: {
        Row: {
          certificate_id: string | null
          created_at: string | null
          description: string
          evidence: Json | null
          id: string
          investigated_by: string | null
          investigation_notes: string | null
          reporter_email: string | null
          reporter_name: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"] | null
          status: string | null
        }
        Insert: {
          certificate_id?: string | null
          created_at?: string | null
          description: string
          evidence?: Json | null
          id?: string
          investigated_by?: string | null
          investigation_notes?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"] | null
          status?: string | null
        }
        Update: {
          certificate_id?: string | null
          created_at?: string | null
          description?: string
          evidence?: Json | null
          id?: string
          investigated_by?: string | null
          investigation_notes?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forgery_reports_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_credentials: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          locked_until: string | null
          login_attempts: number | null
          password_hash: string
          salt: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_hash: string
          salt: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_hash?: string
          salt?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      institutions: {
        Row: {
          address: string | null
          auth_user_id: string | null
          blacklist_reason: string | null
          code: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_blacklisted: boolean | null
          is_verified: boolean | null
          name: string
          updated_at: string | null
          verification_key: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          blacklist_reason?: string | null
          code: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_blacklisted?: boolean | null
          is_verified?: boolean | null
          name: string
          updated_at?: string | null
          verification_key?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          blacklist_reason?: string | null
          code?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_blacklisted?: boolean | null
          is_verified?: boolean | null
          name?: string
          updated_at?: string | null
          verification_key?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          institution_name: string | null
          is_verified: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          institution_name?: string | null
          is_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          institution_name?: string | null
          is_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_academics: {
        Row: {
          certificate_id: string | null
          created_at: string | null
          department: string | null
          division: string | null
          id: string
          institution_id: string | null
          name: string
          roll_number: string
          sgpa_sem1: number | null
          sgpa_sem2: number | null
          sgpa_sem3: number | null
          sgpa_sem4: number | null
          sgpa_sem5: number | null
          sgpa_sem6: number | null
          sgpa_sem7: number | null
          sgpa_sem8: number | null
          source_file: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          certificate_id?: string | null
          created_at?: string | null
          department?: string | null
          division?: string | null
          id?: string
          institution_id?: string | null
          name: string
          roll_number: string
          sgpa_sem1?: number | null
          sgpa_sem2?: number | null
          sgpa_sem3?: number | null
          sgpa_sem4?: number | null
          sgpa_sem5?: number | null
          sgpa_sem6?: number | null
          sgpa_sem7?: number | null
          sgpa_sem8?: number | null
          source_file?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          certificate_id?: string | null
          created_at?: string | null
          department?: string | null
          division?: string | null
          id?: string
          institution_id?: string | null
          name?: string
          roll_number?: string
          sgpa_sem1?: number | null
          sgpa_sem2?: number | null
          sgpa_sem3?: number | null
          sgpa_sem4?: number | null
          sgpa_sem5?: number | null
          sgpa_sem6?: number | null
          sgpa_sem7?: number | null
          sgpa_sem8?: number | null
          source_file?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_academics_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academics_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      Student_Dataset_ordered: {
        Row: {
          Department: string | null
          Division: string | null
          Name: string | null
          Roll_Number: string | null
          Seat_Number: number | null
          SGPA_Sem1: number | null
          SGPA_Sem2: number | null
          SGPA_Sem3: number | null
          SGPA_Sem4: number | null
          SGPA_Sem5: number | null
          SGPA_Sem6: number | null
          SGPA_Sem7: number | null
          SGPA_Sem8: number | null
        }
        Insert: {
          Department?: string | null
          Division?: string | null
          Name?: string | null
          Roll_Number?: string | null
          Seat_Number?: number | null
          SGPA_Sem1?: number | null
          SGPA_Sem2?: number | null
          SGPA_Sem3?: number | null
          SGPA_Sem4?: number | null
          SGPA_Sem5?: number | null
          SGPA_Sem6?: number | null
          SGPA_Sem7?: number | null
          SGPA_Sem8?: number | null
        }
        Update: {
          Department?: string | null
          Division?: string | null
          Name?: string | null
          Roll_Number?: string | null
          Seat_Number?: number | null
          SGPA_Sem1?: number | null
          SGPA_Sem2?: number | null
          SGPA_Sem3?: number | null
          SGPA_Sem4?: number | null
          SGPA_Sem5?: number | null
          SGPA_Sem6?: number | null
          SGPA_Sem7?: number | null
          SGPA_Sem8?: number | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          recipient_role: Database["public"]["Enums"]["user_role"] | null
          severity: Database["public"]["Enums"]["alert_severity"] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          recipient_role?: Database["public"]["Enums"]["user_role"] | null
          severity?: Database["public"]["Enums"]["alert_severity"] | null
          title: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          recipient_role?: Database["public"]["Enums"]["user_role"] | null
          severity?: Database["public"]["Enums"]["alert_severity"] | null
          title?: string
        }
        Relationships: []
      }
      verification_logs: {
        Row: {
          created_at: string
          id: string
          image_hash: string | null
          image_url: string | null
          is_db_verified: boolean | null
          is_tampering_suspected: boolean | null
          mismatches: string[] | null
          notes: string | null
          ocr_extracted_data: Json | null
          qr_verification: Json | null
          student_record_id: string | null
          updated_at: string
          user_input_data: Json | null
          verification_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_hash?: string | null
          image_url?: string | null
          is_db_verified?: boolean | null
          is_tampering_suspected?: boolean | null
          mismatches?: string[] | null
          notes?: string | null
          ocr_extracted_data?: Json | null
          qr_verification?: Json | null
          student_record_id?: string | null
          updated_at?: string
          user_input_data?: Json | null
          verification_status: string
        }
        Update: {
          created_at?: string
          id?: string
          image_hash?: string | null
          image_url?: string | null
          is_db_verified?: boolean | null
          is_tampering_suspected?: boolean | null
          mismatches?: string[] | null
          notes?: string | null
          ocr_extracted_data?: Json | null
          qr_verification?: Json | null
          student_record_id?: string | null
          updated_at?: string
          user_input_data?: Json | null
          verification_status?: string
        }
        Relationships: []
      }
      verification_records: {
        Row: {
          certificate_id: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          verification_data: Json | null
          verification_method: Database["public"]["Enums"]["verification_method"]
          verified_by: string | null
        }
        Insert: {
          certificate_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          verification_data?: Json | null
          verification_method: Database["public"]["Enums"]["verification_method"]
          verified_by?: string | null
        }
        Update: {
          certificate_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          verification_data?: Json | null
          verification_method?: Database["public"]["Enums"]["verification_method"]
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_records_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_flagged_active: {
        Row: {
          certificate_id: string | null
          created_at: string | null
          id: string | null
          institution: string | null
          reason: string | null
          report_count: number | null
          severity: string | null
        }
        Insert: {
          certificate_id?: string | null
          created_at?: string | null
          id?: string | null
          institution?: string | null
          reason?: string | null
          report_count?: number | null
          severity?: string | null
        }
        Update: {
          certificate_id?: string | null
          created_at?: string | null
          id?: string | null
          institution?: string | null
          reason?: string | null
          report_count?: number | null
          severity?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "low" | "medium" | "high" | "critical"
      certificate_status: "pending" | "verified" | "forged" | "expired"
      user_role: "admin" | "institution" | "public"
      verification_method: "ocr" | "blockchain" | "manual" | "watermark"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["low", "medium", "high", "critical"],
      certificate_status: ["pending", "verified", "forged", "expired"],
      user_role: ["admin", "institution", "public"],
      verification_method: ["ocr", "blockchain", "manual", "watermark"],
    },
  },
} as const
