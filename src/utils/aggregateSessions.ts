import { StudySession, TimePeriod, AggregatedData, SummaryMetrics, TeachBackSession, TeachBackMetrics } from '@/types/insights'
import { format, startOfWeek, startOfMonth, startOfDay, endOfDay, endOfWeek, endOfMonth } from 'date-fns'

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

export function calculateSummaryMetrics(
  sessions: StudySession[],
  aggregatedData: AggregatedData,
  teachBacks?: TeachBackSession[]
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

  return {
    totalStudyTime,
    sessionCount,
    avgSessionDuration,
    improvement,
    teachBack: teachBackMetrics
  }
} 