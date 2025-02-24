export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SubscriptionTier = 'free' | 'basic' | 'pro'
export type SubscriptionInterval = 'month' | 'year'

export interface UsageLimits {
  teach_back_sessions: number
  auto_flashcards_enabled: boolean
}

export interface UsageTracking {
  user_id: string
  month_year: string
  teach_back_count: number
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          tier: SubscriptionTier
          interval: SubscriptionInterval
          stripe_subscription_id: string
          stripe_customer_id: string
          current_period_end: string
          cancel_at_period_end: boolean
          status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
          usage_limits: {
            teach_back_sessions: number
            auto_flashcards_enabled: boolean
          }
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          tier: SubscriptionTier
          interval: SubscriptionInterval
          stripe_subscription_id: string
          stripe_customer_id: string
          current_period_end: string
          cancel_at_period_end?: boolean
          status?: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
          usage_limits?: {
            teach_back_sessions: number
            auto_flashcards_enabled: boolean
          }
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          tier?: SubscriptionTier
          interval?: SubscriptionInterval
          stripe_subscription_id?: string
          stripe_customer_id?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          status?: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
          usage_limits?: {
            teach_back_sessions: number
            auto_flashcards_enabled: boolean
          }
        }
      }
      usage_tracking: {
        Row: {
          id: string
          created_at: string
          user_id: string
          month_year: string
          teach_back_count: number
          chat_message_count: number
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          month_year: string
          teach_back_count?: number
          chat_message_count?: number
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          month_year?: string
          teach_back_count?: number
          chat_message_count?: number
        }
      }
      flashcards: {
        Row: {
          id: string
          created_at: string
          study_session_id: string
          question: string
          answer: string
          status: 'new' | 'learning' | 'known'
          ease_factor: number // SM-2 algorithm parameter
          review_interval: number // Current interval in days
          repetitions: number // Number of times reviewed
          last_reviewed_at: string | null
          next_review_at: string | null
          last_recall_rating: 'easy' | 'good' | 'hard' | 'forgot' | null
        }
        Insert: {
          id?: string
          created_at?: string
          study_session_id: string
          question: string
          answer: string
          status?: 'new' | 'learning' | 'known'
          ease_factor?: number
          review_interval?: number
          repetitions?: number
          last_reviewed_at?: string | null
          next_review_at?: string | null
          last_recall_rating?: 'easy' | 'good' | 'hard' | 'forgot' | null
        }
        Update: {
          id?: string
          created_at?: string
          study_session_id?: string
          question?: string
          answer?: string
          status?: 'new' | 'learning' | 'known'
          ease_factor?: number
          review_interval?: number
          repetitions?: number
          last_reviewed_at?: string | null
          next_review_at?: string | null
          last_recall_rating?: 'easy' | 'good' | 'hard' | 'forgot' | null
        }
      }
      study_sessions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          module_title: string
          details: Json
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          module_title: string
          details: Json
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          module_title?: string
          details?: Json
        }
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
  }
} 