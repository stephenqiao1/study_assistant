import { StudySession, TimePeriod, AggregatedData, SummaryMetrics, TeachBackSession, TeachBackMetrics, FlashcardMetrics } from '@/types/insights'
import { format, startOfWeek, startOfMonth, startOfDay, endOfDay, endOfWeek, endOfMonth, isSameDay, isSameWeek, isSameMonth } from 'date-fns'

// Define a proper type for Flashcard
export interface Flashcard {
  id: string
  created_at: string
  study_session_id: string
  question: string
  answer: string
  status: 'new' | 'learning' | 'known'
  ease_factor: number
  review_interval: number
  repetitions: number
  last_reviewed_at: string | null
  next_review_at: string | null
  last_recall_rating: 'easy' | 'good' | 'hard' | 'forgot' | null
}

export function aggregateSessions(
  sessions: StudySession[],
  period: TimePeriod
): AggregatedData {
  const aggregated: AggregatedData = {}

  sessions.forEach(session => {
    const date = new Date(session.started_at)
    let key: string

    switch (period) {
      case 'day':
        key = format(date, 'yyyy-MM-dd')
        break
      case 'week':
        key = format(startOfWeek(date), 'yyyy-MM-dd')
        break
      case 'month':
        key = format(startOfMonth(date), 'yyyy-MM')
        break
    }

    // Convert duration from seconds to minutes
    const durationInMinutes = Math.round((session.duration || 0) / 60)
    aggregated[key] = (aggregated[key] || 0) + durationInMinutes
  })

  return aggregated
}

export function calculateTeachBackMetrics(
  teachBacks: TeachBackSession[],
  period: TimePeriod
): TeachBackMetrics | undefined {
  if (!teachBacks.length) return undefined

  // Sort teach-backs by date
  const sortedTeachBacks = [...teachBacks].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Calculate average grade
  const totalGrade = teachBacks.reduce((sum, tb) => sum + tb.grade, 0)
  const averageGrade = totalGrade / teachBacks.length

  // Calculate average component scores
  const totalClarity = teachBacks.reduce((sum, tb) => sum + tb.feedback.clarity.score, 0)
  const totalCompleteness = teachBacks.reduce((sum, tb) => sum + tb.feedback.completeness.score, 0)
  const totalCorrectness = teachBacks.reduce((sum, tb) => sum + tb.feedback.correctness.score, 0)

  // Calculate improvement by comparing average grades
  const midPoint = Math.floor(teachBacks.length / 2)
  const firstHalf = sortedTeachBacks.slice(0, midPoint)
  const secondHalf = sortedTeachBacks.slice(midPoint)

  const firstHalfAvg = firstHalf.reduce((sum, tb) => sum + tb.grade, 0) / firstHalf.length
  const secondHalfAvg = secondHalf.reduce((sum, tb) => sum + tb.grade, 0) / secondHalf.length

  // Calculate session frequency based on the current period
  const now = new Date()
  let periodStart: Date
  let periodEnd: Date

  switch (period) {
    case 'day':
      periodStart = startOfDay(now)
      periodEnd = endOfDay(now)
      break
    case 'week':
      periodStart = startOfWeek(now)
      periodEnd = endOfWeek(now)
      break
    case 'month':
      periodStart = startOfMonth(now)
      periodEnd = endOfMonth(now)
      break
  }

  // Count sessions in current period
  const sessionsInPeriod = teachBacks.filter(tb => {
    const date = new Date(tb.created_at)
    return date >= periodStart && date <= periodEnd
  }).length

  return {
    totalSessions: teachBacks.length,
    averageGrade: averageGrade,
    averageClarity: totalClarity / teachBacks.length,
    averageCompleteness: totalCompleteness / teachBacks.length,
    averageCorrectness: totalCorrectness / teachBacks.length,
    improvement: ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100,
    sessionFrequency: sessionsInPeriod
  }
}

export function calculateFlashcardMetrics(
  flashcards: Flashcard[],
  period: TimePeriod
): FlashcardMetrics | undefined {
  if (!flashcards.length) return undefined

  // Filter flashcards that have been reviewed at least once
  const reviewedCards = flashcards.filter(card => card.last_reviewed_at)
  if (!reviewedCards.length) return undefined

  // Sort cards by last review date
  const sortedCards = [...reviewedCards].sort((a, b) => {
    const dateA = a.last_reviewed_at ? new Date(a.last_reviewed_at).getTime() : 0;
    const dateB = b.last_reviewed_at ? new Date(b.last_reviewed_at).getTime() : 0;
    return dateA - dateB;
  });

  // Count reviews by rating
  const responseBreakdown = {
    easy: reviewedCards.filter(card => card.last_recall_rating === 'easy').length,
    good: reviewedCards.filter(card => card.last_recall_rating === 'good').length,
    hard: reviewedCards.filter(card => card.last_recall_rating === 'hard').length,
    forgot: reviewedCards.filter(card => card.last_recall_rating === 'forgot').length
  }

  // Calculate status breakdown
  const statusBreakdown = {
    known: flashcards.filter(card => card.status === 'known').length,
    learning: flashcards.filter(card => card.status === 'learning').length,
    new: flashcards.filter(card => card.status === 'new').length
  }

  // Calculate accuracy rate (easy + good responses / total responses)
  const totalResponses = responseBreakdown.easy + responseBreakdown.good + 
                          responseBreakdown.hard + responseBreakdown.forgot
  const accuracyRate = totalResponses > 0 
    ? ((responseBreakdown.easy + responseBreakdown.good) / totalResponses) * 100 
    : 0

  // Group reviews by session to calculate cards per session
  // We'll consider reviews made on the same day as part of the same session
  const reviewsBySession = new Map<string, number>()
  
  sortedCards.forEach(card => {
    if (card.last_reviewed_at) {
      const reviewDate = format(new Date(card.last_reviewed_at), 'yyyy-MM-dd')
      reviewsBySession.set(reviewDate, (reviewsBySession.get(reviewDate) || 0) + 1)
    }
  })

  const sessionsCount = reviewsBySession.size
  const cardsPerSession = sessionsCount > 0 
    ? totalResponses / sessionsCount 
    : 0

  // Calculate improvement in accuracy
  // Compare first half vs second half of reviewed cards
  const midPoint = Math.floor(sortedCards.length / 2)
  const firstHalf = sortedCards.slice(0, midPoint)
  const secondHalf = sortedCards.slice(midPoint)

  // Count correct responses in each half
  const firstHalfCorrect = firstHalf.filter(
    card => card.last_recall_rating === 'easy' || card.last_recall_rating === 'good'
  ).length
  const secondHalfCorrect = secondHalf.filter(
    card => card.last_recall_rating === 'easy' || card.last_recall_rating === 'good'
  ).length

  const firstHalfAccuracy = firstHalf.length > 0 ? (firstHalfCorrect / firstHalf.length) * 100 : 0
  const secondHalfAccuracy = secondHalf.length > 0 ? (secondHalfCorrect / secondHalf.length) * 100 : 0
  
  const improvement = firstHalfAccuracy > 0 
    ? ((secondHalfAccuracy - firstHalfAccuracy) / firstHalfAccuracy) * 100 
    : 0

  // Calculate review frequency based on the selected period
  const now = new Date()
  let _periodStart: Date
  const _periodEnd: Date = now

  switch (period) {
    case 'day':
      _periodStart = startOfDay(now)
      break
    case 'week':
      _periodStart = startOfWeek(now)
      break
    case 'month':
      _periodStart = startOfMonth(now)
      break
  }

  // Count reviews in the current period
  const reviewsInPeriod = sortedCards.filter(card => {
    if (!card.last_reviewed_at) return false
    const reviewDate = new Date(card.last_reviewed_at)
    
    if (period === 'day') {
      return isSameDay(reviewDate, now)
    } else if (period === 'week') {
      return isSameWeek(reviewDate, now)
    } else {
      return isSameMonth(reviewDate, now)
    }
  }).length

  return {
    totalReviewed: totalResponses,
    accuracyRate,
    reviewFrequency: reviewsInPeriod,
    sessionsCount,
    cardsPerSession,
    statusBreakdown,
    improvement,
    responseBreakdown
  }
}

export function calculateSummaryMetrics(
  sessions: StudySession[],
  aggregatedData: AggregatedData,
  teachBacks?: TeachBackSession[],
  flashcards?: Flashcard[]
): SummaryMetrics {
  const totalStudyTime = Object.values(aggregatedData).reduce((sum, time) => sum + time, 0)
  const sessionCount = sessions.length
  const avgSessionDuration = sessionCount ? totalStudyTime / sessionCount : 0

  // Calculate improvement (example: compare with previous period)
  const sortedDates = Object.keys(aggregatedData).sort()
  let improvement: number | undefined

  if (sortedDates.length >= 2) {
    const currentPeriodTime = aggregatedData[sortedDates[sortedDates.length - 1]]
    const previousPeriodTime = aggregatedData[sortedDates[sortedDates.length - 2]]
    improvement = previousPeriodTime ? 
      ((currentPeriodTime - previousPeriodTime) / previousPeriodTime) * 100 : 0
  }

  // Calculate teach-back metrics if available
  const teachBackMetrics = teachBacks ? calculateTeachBackMetrics(teachBacks, 'week') : undefined

  // Calculate flashcard metrics if available
  const flashcardMetrics = flashcards ? calculateFlashcardMetrics(flashcards, 'week') : undefined

  return {
    totalStudyTime,
    sessionCount,
    avgSessionDuration,
    improvement,
    teachBack: teachBackMetrics,
    flashcards: flashcardMetrics
  }
} 