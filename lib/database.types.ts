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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      concepts: {
        Row: {
          created_at: string
          generated_notes_mmd: string | null
          id: string
          mastery_level: Database["public"]["Enums"]["mastery_level"]
          name: string
          order_index: number
          session_id: string
          special_resources: Json | null
          streak_correct: number
          streak_incorrect: number
          subtopic_id: string
          topic_id: string
          updated_at: string
          user_notes_mmd: string | null
        }
        Insert: {
          created_at?: string
          generated_notes_mmd?: string | null
          id?: string
          mastery_level?: Database["public"]["Enums"]["mastery_level"]
          name: string
          order_index?: number
          session_id: string
          special_resources?: Json | null
          streak_correct?: number
          streak_incorrect?: number
          subtopic_id: string
          topic_id: string
          updated_at?: string
          user_notes_mmd?: string | null
        }
        Update: {
          created_at?: string
          generated_notes_mmd?: string | null
          id?: string
          mastery_level?: Database["public"]["Enums"]["mastery_level"]
          name?: string
          order_index?: number
          session_id?: string
          special_resources?: Json | null
          streak_correct?: number
          streak_incorrect?: number
          subtopic_id?: string
          topic_id?: string
          updated_at?: string
          user_notes_mmd?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concepts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concepts_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concepts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          concept_id: string
          correct_option_index: number
          created_at: string
          explanation: string | null
          id: string
          options: Json
          question_text: string
          session_id: string
          subtopic_id: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          concept_id: string
          correct_option_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          options: Json
          question_text: string
          session_id: string
          subtopic_id: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          concept_id?: string
          correct_option_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          question_text?: string
          session_id?: string
          subtopic_id?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          raw_mmd: string | null
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          raw_mmd?: string | null
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          raw_mmd?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subtopics: {
        Row: {
          created_at: string
          generated_notes_mmd: string | null
          id: string
          name: string
          order_index: number
          session_id: string
          special_resources: Json | null
          topic_id: string
          updated_at: string
          user_notes_mmd: string | null
        }
        Insert: {
          created_at?: string
          generated_notes_mmd?: string | null
          id?: string
          name: string
          order_index?: number
          session_id: string
          special_resources?: Json | null
          topic_id: string
          updated_at?: string
          user_notes_mmd?: string | null
        }
        Update: {
          created_at?: string
          generated_notes_mmd?: string | null
          id?: string
          name?: string
          order_index?: number
          session_id?: string
          special_resources?: Json | null
          topic_id?: string
          updated_at?: string
          user_notes_mmd?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtopics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtopics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          generated_notes_mmd: string | null
          id: string
          name: string
          order_index: number
          session_id: string
          special_resources: Json | null
          updated_at: string
          user_notes_mmd: string | null
        }
        Insert: {
          created_at?: string
          generated_notes_mmd?: string | null
          id?: string
          name: string
          order_index?: number
          session_id: string
          special_resources?: Json | null
          updated_at?: string
          user_notes_mmd?: string | null
        }
        Update: {
          created_at?: string
          generated_notes_mmd?: string | null
          id?: string
          name?: string
          order_index?: number
          session_id?: string
          special_resources?: Json | null
          updated_at?: string
          user_notes_mmd?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      word_game_entries: {
        Row: {
          clue: string
          concept_id: string
          created_at: string
          id: string
          order_index: number
          session_id: string
          subtopic_id: string
          topic_id: string
          updated_at: string
          word: string
        }
        Insert: {
          clue: string
          concept_id: string
          created_at?: string
          id?: string
          order_index?: number
          session_id: string
          subtopic_id: string
          topic_id: string
          updated_at?: string
          word: string
        }
        Update: {
          clue?: string
          concept_id?: string
          created_at?: string
          id?: string
          order_index?: number
          session_id?: string
          subtopic_id?: string
          topic_id?: string
          updated_at?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_game_entries_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_game_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_game_entries_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_game_entries_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
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
      mastery_level: "Cooked" | "Meh" | "There's Hope" | "Locked in"
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
      mastery_level: ["Cooked", "Meh", "There's Hope", "Locked in"],
    },
  },
} as const

