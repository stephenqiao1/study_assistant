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
      study_sessions: {
        Row: {
          id: string
          user_id: string
          module_title: string
          started_at: string
          ended_at: string | null
          details: {
            title: string
            content: string
            feedback?: Array<{
              question: string
              timestamp: string
            }>
            quiz?: {
              question: string
              correct_answer: string
              user_answer: string
              score: number
            }
            peer_reviews?: Array<{
              reviewer_id: string
              rating: number
              comment: string
            }>
          }
        }
        Insert: {
          id?: string
          user_id: string
          module_title: string
          started_at?: string
          ended_at?: string | null
          details?: Json
        }
        Update: {
          id?: string
          user_id?: string
          module_title?: string
          started_at?: string
          ended_at?: string | null
          details?: Json
        }
      }
    }
  }
} 