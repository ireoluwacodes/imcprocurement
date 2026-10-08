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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          summary: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          summary?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          summary?: string
        }
        Relationships: []
      }
      approvals: {
        Row: {
          assignee_id: string | null
          comments: string | null
          created_at: string
          decided_at: string | null
          decision: Database["public"]["Enums"]["approval_decision"]
          form_id: string
          form_type: string
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          step_order: number
        }
        Insert: {
          assignee_id?: string | null
          comments?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          form_id: string
          form_type: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          step_order?: number
        }
        Update: {
          assignee_id?: string | null
          comments?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          form_id?: string
          form_type?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          step_order?: number
        }
        Relationships: []
      }
      attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          form_id: string
          form_type: string
          id: string
          uploaded_by: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          form_id: string
          form_type: string
          id?: string
          uploaded_by: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          form_id?: string
          form_type?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          form_id: string
          form_type: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          form_id: string
          form_type: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          form_id?: string
          form_type?: string
          id?: string
        }
        Relationships: []
      }
      connexes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connexes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_substitutions: {
        Row: {
          priority: string
          approver_id: string | null
          approver_signature: string | null
          approver_signed_at: string | null
          certified: boolean
          created_at: string
          created_by: string
          custom_fields: Json
          es_number: string
          from_equipment: string | null
          from_location: string | null
          id: string
          on_equipment: string | null
          on_location: string | null
          project_id: string | null
          reason: string | null
          requester_signature: string | null
          requester_signed_at: string | null
          review_comments: string | null
          review_decision: Database["public"]["Enums"]["approval_decision"]
          specified_item: string | null
          status: Database["public"]["Enums"]["form_status"]
          updated_at: string
        }
        Insert: {
          priority?: string
          approver_id?: string | null
          approver_signature?: string | null
          approver_signed_at?: string | null
          certified?: boolean
          created_at?: string
          created_by: string
          custom_fields?: Json
          es_number: string
          from_equipment?: string | null
          from_location?: string | null
          id?: string
          on_equipment?: string | null
          on_location?: string | null
          project_id?: string | null
          reason?: string | null
          requester_signature?: string | null
          requester_signed_at?: string | null
          review_comments?: string | null
          review_decision?: Database["public"]["Enums"]["approval_decision"]
          specified_item?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          updated_at?: string
        }
        Update: {
          priority?: string
          approver_id?: string | null
          approver_signature?: string | null
          approver_signed_at?: string | null
          certified?: boolean
          created_at?: string
          created_by?: string
          custom_fields?: Json
          es_number?: string
          from_equipment?: string | null
          from_location?: string | null
          id?: string
          on_equipment?: string | null
          on_location?: string | null
          project_id?: string | null
          reason?: string | null
          requester_signature?: string | null
          requester_signed_at?: string | null
          review_comments?: string | null
          review_decision?: Database["public"]["Enums"]["approval_decision"]
          specified_item?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_substitutions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          field_key: string
          field_type: string
          form_type: string
          id: string
          is_active: boolean
          label: string
          options: string[]
          required: boolean
          sort_order: number
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          field_key: string
          field_type?: string
          form_type: string
          id?: string
          is_active?: boolean
          label: string
          options?: string[]
          required?: boolean
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          field_key?: string
          field_type?: string
          form_type?: string
          id?: string
          is_active?: boolean
          label?: string
          options?: string[]
          required?: boolean
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string
          connex_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          photo_path: string | null
          project_id: string | null
          serial_number: string | null
          starting_qty: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          connex_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          photo_path?: string | null
          project_id?: string | null
          serial_number?: string | null
          starting_qty?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          connex_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          photo_path?: string | null
          project_id?: string | null
          serial_number?: string | null
          starting_qty?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_connex_id_fkey"
            columns: ["connex_id"]
            isOneToOne: false
            referencedRelation: "connexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          item_id: string
          movement_type: string
          note: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          item_id: string
          movement_type: string
          note?: string | null
          quantity: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          movement_type?: string
          note?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      job_roles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      material_transfers: {
        Row: {
          priority: string
          approver_id: string | null
          created_at: string
          created_by: string
          custom_fields: Json
          driver: string | null
          factory_po_number: string | null
          id: string
          line_items: Json
          mtf_number: string
          project_id: string | null
          received_by_contact: string | null
          received_by_date: string | null
          received_by_name: string | null
          received_by_signature: string | null
          related_pr_id: string | null
          remarks: string | null
          status: Database["public"]["Enums"]["form_status"]
          to_order_number: string | null
          transfer_date: string
          transfer_type: string | null
          transferred_by_contact: string | null
          transferred_by_date: string | null
          transferred_by_name: string | null
          transferred_by_signature: string | null
          updated_at: string
          vehicle: string | null
          vendor_name: string | null
        }
        Insert: {
          priority?: string
          approver_id?: string | null
          created_at?: string
          created_by: string
          custom_fields?: Json
          driver?: string | null
          factory_po_number?: string | null
          id?: string
          line_items?: Json
          mtf_number: string
          project_id?: string | null
          received_by_contact?: string | null
          received_by_date?: string | null
          received_by_name?: string | null
          received_by_signature?: string | null
          related_pr_id?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          to_order_number?: string | null
          transfer_date?: string
          transfer_type?: string | null
          transferred_by_contact?: string | null
          transferred_by_date?: string | null
          transferred_by_name?: string | null
          transferred_by_signature?: string | null
          updated_at?: string
          vehicle?: string | null
          vendor_name?: string | null
        }
        Update: {
          priority?: string
          approver_id?: string | null
          created_at?: string
          created_by?: string
          custom_fields?: Json
          driver?: string | null
          factory_po_number?: string | null
          id?: string
          line_items?: Json
          mtf_number?: string
          project_id?: string | null
          received_by_contact?: string | null
          received_by_date?: string | null
          received_by_name?: string | null
          received_by_signature?: string | null
          related_pr_id?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          to_order_number?: string | null
          transfer_date?: string
          transfer_type?: string | null
          transferred_by_contact?: string | null
          transferred_by_date?: string | null
          transferred_by_name?: string | null
          transferred_by_signature?: string | null
          updated_at?: string
          vehicle?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_transfers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_transfers_related_pr_id_fkey"
            columns: ["related_pr_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          job_role: string | null
          last_name: string
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company?: string
          created_at?: string
          email: string
          first_name?: string
          id: string
          is_active?: boolean
          job_role?: string | null
          last_name?: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          job_role?: string | null
          last_name?: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          costpoint_code: string | null
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          name: string
          number: string
          status: string
          updated_at: string
        }
        Insert: {
          client?: string | null
          costpoint_code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          name: string
          number: string
          status?: string
          updated_at?: string
        }
        Update: {
          client?: string | null
          costpoint_code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          name?: string
          number?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_requests: {
        Row: {
          priority: string
          approver_id: string | null
          buyer: string | null
          costpoint_code: string | null
          created_at: string
          created_by: string
          custom_fields: Json
          id: string
          line_items: Json
          module: string | null
          notes: string | null
          po_date: string | null
          po_number: string | null
          pr_number: string
          project_id: string | null
          purchase_status: string
          reason_other: string | null
          reasons: string[]
          request_date: string
          requester_name: string | null
          requester_phone: string | null
          required_date: string | null
          ship_method: string | null
          ship_to: string | null
          ship_via: string | null
          status: Database["public"]["Enums"]["form_status"]
          total: number
          updated_at: string
          vendor: string | null
          vendor_contact_email: string | null
          vendor_contact_name: string | null
          vendor_contact_phone: string | null
          work_order: string | null
        }
        Insert: {
          priority?: string
          approver_id?: string | null
          buyer?: string | null
          costpoint_code?: string | null
          created_at?: string
          created_by: string
          custom_fields?: Json
          id?: string
          line_items?: Json
          module?: string | null
          notes?: string | null
          po_date?: string | null
          po_number?: string | null
          pr_number: string
          project_id?: string | null
          purchase_status?: string
          reason_other?: string | null
          reasons?: string[]
          request_date?: string
          requester_name?: string | null
          requester_phone?: string | null
          required_date?: string | null
          ship_method?: string | null
          ship_to?: string | null
          ship_via?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          total?: number
          updated_at?: string
          vendor?: string | null
          vendor_contact_email?: string | null
          vendor_contact_name?: string | null
          vendor_contact_phone?: string | null
          work_order?: string | null
        }
        Update: {
          priority?: string
          approver_id?: string | null
          buyer?: string | null
          costpoint_code?: string | null
          created_at?: string
          created_by?: string
          custom_fields?: Json
          id?: string
          line_items?: Json
          module?: string | null
          notes?: string | null
          po_date?: string | null
          po_number?: string | null
          pr_number?: string
          project_id?: string | null
          purchase_status?: string
          reason_other?: string | null
          reasons?: string[]
          request_date?: string
          requester_name?: string | null
          requester_phone?: string | null
          required_date?: string | null
          ship_method?: string | null
          ship_to?: string | null
          ship_via?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          total?: number
          updated_at?: string
          vendor?: string | null
          vendor_contact_email?: string | null
          vendor_contact_name?: string | null
          vendor_contact_phone?: string | null
          work_order?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "superintendent"
        | "executive"
        | "project_manager"
        | "trade_partner"
        | "installation"
        | "procurement"
      approval_decision:
        | "pending"
        | "approved"
        | "approved_as_noted"
        | "revise_resubmit"
        | "rejected"
      form_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "approved"
        | "rejected"
        | "revise"
        | "completed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "superintendent",
        "executive",
        "project_manager",
        "trade_partner",
        "installation",
        "procurement",
      ],
      approval_decision: [
        "pending",
        "approved",
        "approved_as_noted",
        "revise_resubmit",
        "rejected",
      ],
      form_status: [
        "draft",
        "submitted",
        "in_review",
        "approved",
        "rejected",
        "revise",
        "completed",
      ],
    },
  },
} as const
