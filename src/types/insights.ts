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

export interface SummaryMetrics {
  totalStudyTime: number
  sessionCount: number
  avgSessionDuration: number
  improvement?: number // percentage improvement from last period
  teachBack?: TeachBackMetrics
} 