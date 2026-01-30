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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      focus_mode_states: {
        Row: {
          active_mode: string | null
          created_at: string
          date: string
          id: string
          last_completed_mode: string | null
          modes: Json
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          active_mode?: string | null
          created_at?: string
          date: string
          id?: string
          last_completed_mode?: string | null
          modes?: Json
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          active_mode?: string | null
          created_at?: string
          date?: string
          id?: string
          last_completed_mode?: string | null
          modes?: Json
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          last_checked_at: string | null
          name: string
          next_action: string | null
          owner: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          name: string
          next_action?: string | null
          owner?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          name?: string
          next_action?: string | null
          owner?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_snapshots: {
        Row: {
          ads_maximo: number | null
          caixa_livre_real: number | null
          cpa_medio: number | null
          created_at: string | null
          decisao_ads: string | null
          gasto_ads: number | null
          id: string
          pedidos_semana: number | null
          prioridade_semana: string | null
          registro_decisao: string | null
          resultado_mes: number | null
          roas_medio: number | null
          score_demanda: number | null
          score_financeiro: number | null
          score_organico: number | null
          score_sessoes: number | null
          sessoes_semana: number | null
          status_demanda: string | null
          status_financeiro: string | null
          status_organico: string | null
          ticket_medio: number | null
          total_defasados: number | null
          user_id: string
          week_start: string
        }
        Insert: {
          ads_maximo?: number | null
          caixa_livre_real?: number | null
          cpa_medio?: number | null
          created_at?: string | null
          decisao_ads?: string | null
          gasto_ads?: number | null
          id?: string
          pedidos_semana?: number | null
          prioridade_semana?: string | null
          registro_decisao?: string | null
          resultado_mes?: number | null
          roas_medio?: number | null
          score_demanda?: number | null
          score_financeiro?: number | null
          score_organico?: number | null
          score_sessoes?: number | null
          sessoes_semana?: number | null
          status_demanda?: string | null
          status_financeiro?: string | null
          status_organico?: string | null
          ticket_medio?: number | null
          total_defasados?: number | null
          user_id: string
          week_start: string
        }
        Update: {
          ads_maximo?: number | null
          caixa_livre_real?: number | null
          cpa_medio?: number | null
          created_at?: string | null
          decisao_ads?: string | null
          gasto_ads?: number | null
          id?: string
          pedidos_semana?: number | null
          prioridade_semana?: string | null
          registro_decisao?: string | null
          resultado_mes?: number | null
          roas_medio?: number | null
          score_demanda?: number | null
          score_financeiro?: number | null
          score_organico?: number | null
          score_sessoes?: number | null
          sessoes_semana?: number | null
          status_demanda?: string | null
          status_financeiro?: string | null
          status_organico?: string | null
          ticket_medio?: number | null
          total_defasados?: number | null
          user_id?: string
          week_start?: string
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
