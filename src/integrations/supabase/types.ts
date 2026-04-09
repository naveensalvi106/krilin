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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_sections: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      mind_map_nodes: {
        Row: {
          created_at: string
          id: string
          parent_id: string | null
          sort_order: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id?: string | null
          sort_order?: number
          text?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string | null
          sort_order?: number
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mind_map_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "mind_map_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      notepad_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          images: string[] | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          images?: string[] | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          images?: string[] | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      revival_steps: {
        Row: {
          created_at: string
          description: string
          id: string
          step: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          step: number
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          step?: number
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      revival_videos: {
        Row: {
          channel: string
          created_at: string
          id: string
          title: string
          url: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          title: string
          url: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      task_presets: {
        Row: {
          bandaids: string[] | null
          created_at: string
          icon_urls: string[] | null
          id: string
          problems: Json
          reminder_time: string | null
          section_id: string
          title: string
          user_id: string
          visualizations: Json
        }
        Insert: {
          bandaids?: string[] | null
          created_at?: string
          icon_urls?: string[] | null
          id?: string
          problems?: Json
          reminder_time?: string | null
          section_id: string
          title: string
          user_id: string
          visualizations?: Json
        }
        Update: {
          bandaids?: string[] | null
          created_at?: string
          icon_urls?: string[] | null
          id?: string
          problems?: Json
          reminder_time?: string | null
          section_id?: string
          title?: string
          user_id?: string
          visualizations?: Json
        }
        Relationships: []
      }
      tasks: {
        Row: {
          bandaids: string[] | null
          completed: boolean
          created_at: string
          custom_section_id: string | null
          icon_url: string | null
          icon_urls: string[] | null
          id: string
          problems: Json | null
          reminder_time: string | null
          section_id: string
          sort_order: number
          task_date: string
          title: string
          user_id: string
        }
        Insert: {
          bandaids?: string[] | null
          completed?: boolean
          created_at?: string
          custom_section_id?: string | null
          icon_url?: string | null
          icon_urls?: string[] | null
          id?: string
          problems?: Json | null
          reminder_time?: string | null
          section_id: string
          sort_order?: number
          task_date?: string
          title: string
          user_id: string
        }
        Update: {
          bandaids?: string[] | null
          completed?: boolean
          created_at?: string
          custom_section_id?: string | null
          icon_url?: string | null
          icon_urls?: string[] | null
          id?: string
          problems?: Json | null
          reminder_time?: string | null
          section_id?: string
          sort_order?: number
          task_date?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_custom_section_id_fkey"
            columns: ["custom_section_id"]
            isOneToOne: false
            referencedRelation: "custom_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_messages: {
        Row: {
          chat_id: number
          created_at: string
          raw_update: Json
          text: string | null
          update_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string
          raw_update: Json
          text?: string | null
          update_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string
          raw_update?: Json
          text?: string | null
          update_id?: number
        }
        Relationships: []
      }
      telegram_user_links: {
        Row: {
          chat_id: number
          id: string
          linked_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          chat_id: number
          id?: string
          linked_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          chat_id?: number
          id?: string
          linked_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      tick_list_items: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          list_id: string
          sort_order: number
          text: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          list_id: string
          sort_order?: number
          text: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          list_id?: string
          sort_order?: number
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tick_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "tick_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      tick_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      visualizations: {
        Row: {
          created_at: string
          id: string
          image: string | null
          task_id: string | null
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          task_id?: string | null
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          task_id?: string | null
          text?: string
          user_id?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
