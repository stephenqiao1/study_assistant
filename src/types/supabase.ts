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