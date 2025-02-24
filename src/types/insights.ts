export type TimePeriod = 'day' | 'week' | 'month'

export interface StudySession {
  id: string
  started_at: string
  user_id: string
  module_title: string
  duration?: number // in minutes
}

export interface TeachBackSession {
  id: string
  created_at: string
  study_session_id: string
  grade: number
  content: string
  feedback: {
    clarity: { score: number, feedback: string }
    completeness: { score: number, feedback: string }
    correctness: { score: number, feedback: string }
  }
}

export interface AggregatedData {
  [key: string]: number // date string -> total minutes
}

export interface TeachBackMetrics {
  totalSessions: number
  averageGrade: number
  averageClarity: number
  averageCompleteness: number
  averageCorrectness: number
  improvement: number // percentage improvement from last period
  sessionFrequency: number // sessions per day/week/month
}

export interface FlashcardMetrics {
  totalReviewed: number // total number of flashcard reviews
  accuracyRate: number // percentage of correct responses (easy + good)
  reviewFrequency: number // reviews per day/week/month
  sessionsCount: number // number of flashcard sessions
  cardsPerSession: number // average cards per session
  statusBreakdown: {
    known: number
    learning: number
    new: number
  }
  improvement: number // percentage improvement in accuracy from last period
  responseBreakdown: {
    easy: number
    good: number
    hard: number 
    forgot: number
  }
}

export interface SummaryMetrics {
  totalStudyTime: number
  sessionCount: number
  avgSessionDuration: number
  improvement?: number // percentage improvement from last period
  teachBack?: TeachBackMetrics
  flashcards?: FlashcardMetrics
} 