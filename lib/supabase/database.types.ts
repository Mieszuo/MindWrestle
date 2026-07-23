export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      conversation_attempts: {
        Row: {
          ai_model_character: string | null;
          ai_model_judge: string | null;
          completed_by: string | null;
          created_at: string;
          current_emotion_state: Json;
          duration_ms: number | null;
          ended_at: string | null;
          failure_reason: string | null;
          goal_progress: number;
          id: string;
          last_activity_at: string;
          level_id: number;
          memory_summary: string | null;
          npc_messages_count: number;
          psych_state: Json | null;
          reputation_context: Json | null;
          reputation_session: Json;
          started_at: string;
          status: string;
          turns_count: number;
          updated_at: string;
          user_id: string;
          user_messages_count: number;
        };
        Insert: {
          ai_model_character?: string | null;
          ai_model_judge?: string | null;
          completed_by?: string | null;
          created_at?: string;
          current_emotion_state?: Json;
          duration_ms?: number | null;
          ended_at?: string | null;
          failure_reason?: string | null;
          goal_progress?: number;
          id?: string;
          last_activity_at?: string;
          level_id: number;
          memory_summary?: string | null;
          npc_messages_count?: number;
          psych_state?: Json | null;
          reputation_context?: Json | null;
          reputation_session?: Json;
          started_at?: string;
          status?: string;
          turns_count?: number;
          updated_at?: string;
          user_id: string;
          user_messages_count?: number;
        };
        Update: {
          ai_model_character?: string | null;
          ai_model_judge?: string | null;
          completed_by?: string | null;
          created_at?: string;
          current_emotion_state?: Json;
          duration_ms?: number | null;
          ended_at?: string | null;
          failure_reason?: string | null;
          goal_progress?: number;
          id?: string;
          last_activity_at?: string;
          level_id?: number;
          memory_summary?: string | null;
          npc_messages_count?: number;
          psych_state?: Json | null;
          reputation_context?: Json | null;
          reputation_session?: Json;
          started_at?: string;
          status?: string;
          turns_count?: number;
          updated_at?: string;
          user_id?: string;
          user_messages_count?: number;
        };
        Relationships: [];
      };
      conversation_messages: {
        Row: {
          attempt_id: string;
          content: string;
          created_at: string;
          emotion_state_after: Json | null;
          emotion_state_before: Json | null;
          id: string;
          judge_output: Json | null;
          level_id: number;
          metadata: Json;
          role: string;
          turn_index: number;
          user_id: string;
        };
        Insert: {
          attempt_id: string;
          content: string;
          created_at?: string;
          emotion_state_after?: Json | null;
          emotion_state_before?: Json | null;
          id?: string;
          judge_output?: Json | null;
          level_id: number;
          metadata?: Json;
          role: string;
          turn_index: number;
          user_id: string;
        };
        Update: {
          attempt_id?: string;
          content?: string;
          created_at?: string;
          emotion_state_after?: Json | null;
          emotion_state_before?: Json | null;
          id?: string;
          judge_output?: Json | null;
          level_id?: number;
          metadata?: Json;
          role?: string;
          turn_index?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      game_levels: {
        Row: {
          archetype: string;
          character_config: Json;
          character_name: string;
          created_at: string;
          defeat_config: Json;
          difficulty_label: string;
          difficulty_score: number;
          i18n: Json;
          id: number;
          is_active: boolean;
          objective_config: Json;
          objective_type: string;
          order_index: number;
          short_description: string;
          slug: string;
          starting_emotion_state: Json;
          title: string;
          unlock_config: Json;
          updated_at: string;
        };
        Insert: {
          archetype: string;
          character_config?: Json;
          character_name: string;
          created_at?: string;
          defeat_config?: Json;
          difficulty_label: string;
          difficulty_score: number;
          i18n?: Json;
          id: number;
          is_active?: boolean;
          objective_config?: Json;
          objective_type: string;
          order_index: number;
          short_description: string;
          slug: string;
          starting_emotion_state?: Json;
          title: string;
          unlock_config?: Json;
          updated_at?: string;
        };
        Update: {
          archetype?: string;
          character_config?: Json;
          character_name?: string;
          created_at?: string;
          defeat_config?: Json;
          difficulty_label?: string;
          difficulty_score?: number;
          i18n?: Json;
          id?: number;
          is_active?: boolean;
          objective_config?: Json;
          objective_type?: string;
          order_index?: number;
          short_description?: string;
          slug?: string;
          starting_emotion_state?: Json;
          title?: string;
          unlock_config?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      game_sessions: {
        Row: {
          created_at: string;
          id: string;
          level_id: number;
          messages: Json;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          level_id: number;
          messages?: Json;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          level_id?: number;
          messages?: Json;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      level_completions: {
        Row: {
          best_score: Json | null;
          completed_at: string;
          id: string;
          level_id: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          best_score?: Json | null;
          completed_at?: string;
          id?: string;
          level_id: number;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          best_score?: Json | null;
          completed_at?: string;
          id?: string;
          level_id?: number;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          game_intro_seen_at: string | null;
          game_intro_version: number;
          has_seen_game_intro: boolean;
          id: string;
          lore_state: Json;
          npc_relations: Json;
          reputation: Json;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          game_intro_seen_at?: string | null;
          game_intro_version?: number;
          has_seen_game_intro?: boolean;
          id: string;
          lore_state?: Json;
          npc_relations?: Json;
          reputation?: Json;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          game_intro_seen_at?: string | null;
          game_intro_version?: number;
          has_seen_game_intro?: boolean;
          id?: string;
          lore_state?: Json;
          npc_relations?: Json;
          reputation?: Json;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      level_rankings: {
        Row: {
          attempt_id: string;
          completed_at: string;
          created_at: string;
          display_name: string | null;
          duration_ms: number;
          id: string;
          level_id: number;
          turns_count: number;
          user_id: string;
        };
        Insert: {
          attempt_id: string;
          completed_at: string;
          created_at?: string;
          display_name?: string | null;
          duration_ms: number;
          id?: string;
          level_id: number;
          turns_count: number;
          user_id: string;
        };
        Update: {
          attempt_id?: string;
          completed_at?: string;
          created_at?: string;
          display_name?: string | null;
          duration_ms?: number;
          id?: string;
          level_id?: number;
          turns_count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_level_progress: {
        Row: {
          attempts_count: number;
          best_attempt_id: string | null;
          best_time_ms: number | null;
          completed_at: string | null;
          completed_attempts_count: number;
          created_at: string;
          failed_attempts_count: number;
          id: string;
          last_attempt_id: string | null;
          last_status: string | null;
          last_time_ms: number | null;
          level_id: number;
          status: string;
          unlocked_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts_count?: number;
          best_attempt_id?: string | null;
          best_time_ms?: number | null;
          completed_at?: string | null;
          completed_attempts_count?: number;
          created_at?: string;
          failed_attempts_count?: number;
          id?: string;
          last_attempt_id?: string | null;
          last_status?: string | null;
          last_time_ms?: number | null;
          level_id: number;
          status: string;
          unlocked_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts_count?: number;
          best_attempt_id?: string | null;
          best_time_ms?: number | null;
          completed_at?: string | null;
          completed_attempts_count?: number;
          created_at?: string;
          failed_attempts_count?: number;
          id?: string;
          last_attempt_id?: string | null;
          last_status?: string | null;
          last_time_ms?: number | null;
          level_id?: number;
          status?: string;
          unlocked_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_usage_events: {
        Row: {
          attempt_id: string | null;
          call_type: string;
          completion_tokens: number;
          cost_usd: number | null;
          created_at: string;
          error_message: string | null;
          id: string;
          latency_ms: number | null;
          level_id: number | null;
          model: string;
          prompt_tokens: number;
          provider: string;
          success: boolean;
          total_tokens: number;
          user_id: string;
        };
        Insert: {
          attempt_id?: string | null;
          call_type: string;
          completion_tokens?: number;
          cost_usd?: number | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          latency_ms?: number | null;
          level_id?: number | null;
          model: string;
          prompt_tokens?: number;
          provider?: string;
          success?: boolean;
          total_tokens?: number;
          user_id: string;
        };
        Update: {
          attempt_id?: string | null;
          call_type?: string;
          completion_tokens?: number;
          cost_usd?: number | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          latency_ms?: number | null;
          level_id?: number | null;
          model?: string;
          prompt_tokens?: number;
          provider?: string;
          success?: boolean;
          total_tokens?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_attempt_wallets: {
        Row: {
          created_at: string;
          frozen_at: string | null;
          paid_attempts_balance: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          frozen_at?: string | null;
          paid_attempts_balance?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          frozen_at?: string | null;
          paid_attempts_balance?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      attempt_ledger: {
        Row: {
          amount: number;
          attempt_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          level_id: number | null;
          period_key: string | null;
          source: string;
          stripe_event_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          attempt_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          level_id?: number | null;
          period_key?: string | null;
          source: string;
          stripe_event_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          attempt_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          level_id?: number | null;
          period_key?: string | null;
          source?: string;
          stripe_event_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      billing_customers: {
        Row: {
          created_at: string;
          stripe_customer_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          stripe_customer_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          stripe_customer_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      billing_events: {
        Row: {
          checkout_session_id: string | null;
          event_type: string;
          id: string;
          payload: Json;
          processed_at: string;
          stripe_event_id: string;
          user_id: string | null;
        };
        Insert: {
          checkout_session_id?: string | null;
          event_type: string;
          id?: string;
          payload?: Json;
          processed_at?: string;
          stripe_event_id: string;
          user_id?: string | null;
        };
        Update: {
          checkout_session_id?: string | null;
          event_type?: string;
          id?: string;
          payload?: Json;
          processed_at?: string;
          stripe_event_id?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      voice_usage_quotas: {
        Row: {
          stt_requests: number;
          tts_chars: number;
          updated_at: string;
          usage_date: string;
          user_id: string;
        };
        Insert: {
          stt_requests?: number;
          tts_chars?: number;
          updated_at?: string;
          usage_date: string;
          user_id: string;
        };
        Update: {
          stt_requests?: number;
          tts_chars?: number;
          updated_at?: string;
          usage_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_attempt_credit: {
        Args: {
          p_free_limit: number;
          p_level_id: number;
          p_period_key: string;
          p_user_id: string;
        };
        Returns: Array<{
          allowed: boolean;
          free_remaining: number;
          ledger_id: string | null;
          paid_remaining: number;
          source: string | null;
        }>;
      };
      attach_attempt_ledger: {
        Args: {
          p_attempt_id: string;
          p_ledger_id: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      start_attempt_atomic: {
        Args: {
          p_user_id: string;
          p_level_id: number;
          p_period_key: string;
          p_free_limit: number;
          p_emotion_state: Json;
          p_reputation_session: Json;
          p_reputation_context: Json;
          p_psych_state: Json | null;
          p_progress_id: string;
          p_now: string;
        };
        Returns: Array<{
          allowed: boolean;
          source: string | null;
          free_remaining: number;
          paid_remaining: number;
          attempt: Json | null;
        }>;
      };
      credit_paid_attempt_pack: {
        Args: {
          p_amount: number;
          p_checkout_session_id: string;
          p_description: string;
          p_event_type: string;
          p_payload: Json;
          p_stripe_event_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      apply_billing_adjustment: {
        Args: {
          p_amount: number;
          p_description: string;
          p_event_type: string;
          p_payload: Json;
          p_stripe_event_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      freeze_attempt_wallet: {
        Args: {
          p_event_type: string;
          p_payload: Json;
          p_stripe_event_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      consume_voice_quota: {
        Args: {
          p_stt_daily_limit: number;
          p_stt_requests: number;
          p_tts_chars: number;
          p_tts_daily_limit: number;
          p_user_id: string;
        };
        Returns: Array<{
          allowed: boolean;
          stt_used: number;
          tts_used: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
