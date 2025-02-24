'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useRouter } from 'next/navigation'
import { StudySession, TimePeriod, TeachBackSession } from '@/types/insights'
import { aggregateSessions, calculateSummaryMetrics } from '@/utils/aggregateSessions'
import StudyTimeChart from '@/components/insights/StudyTimeChart'
import TeachBackChart from '@/components/insights/TeachBackChart'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Clock, BookOpen, TrendingUp, Brain, Target, Lock } from 'lucide-react'
import { UpgradeBanner } from '@/components/subscription/UpgradeBanner'

interface StudyDuration {
  activity_type: 'module' | 'teach_back' | 'flashcards'
  duration?: number
}

interface ActivityBreakdown {
  module: number
  teach_back: number
  flashcards: number
}

interface SessionWithDurations extends StudySession {
  activityBreakdown: ActivityBreakdown
  study_durations?: StudyDuration[]
}

export default function LearningInsights() {
  const router = useRouter()
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const [period, setPeriod] = useState<TimePeriod>('week')
  const [sessions, setSessions] = useState<SessionWithDurations[]>([])
  const [teachBacks, setTeachBacks] = useState<TeachBackSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'pro'>('free')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && !session) {
      router.push('/login')
    }
  }, [session, isLoadingAuth, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) return

      const supabase = createClient()
      
      try {
        // Fetch subscription tier
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('tier')
          .eq('user_id', session.user.id)
          .single()

        if (subError) throw subError
        setSubscriptionTier(subscription.tier)

        // Fetch study sessions with durations
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('study_sessions')
          .select(`
            *,
            study_durations (
              activity_type,
              duration
            )
          `)
          .eq('user_id', session.user.id)
          .order('started_at', { ascending: false })

        if (sessionsError) throw sessionsError

        // Fetch teach-back sessions
        const { data: teachBackData, error: teachBackError } = await supabase
          .from('teach_backs')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        if (teachBackError) throw teachBackError

        // Calculate total duration and activity breakdown for each session
        const sessionsWithDurations = sessionsData.map(session => {
          const durations = (session.study_durations || []) as StudyDuration[]
          const totalDuration = durations.reduce((total: number, d: StudyDuration) => 
            total + (d.duration || 0), 0)
          
          const activityBreakdown: ActivityBreakdown = {
            module: durations
              .filter((d: StudyDuration) => d.activity_type === 'module')
              .reduce((total: number, d: StudyDuration) => total + (d.duration || 0), 0),
            teach_back: durations
              .filter((d: StudyDuration) => d.activity_type === 'teach_back')
              .reduce((total: number, d: StudyDuration) => total + (d.duration || 0), 0),
            flashcards: durations
              .filter((d: StudyDuration) => d.activity_type === 'flashcards')
              .reduce((total: number, d: StudyDuration) => total + (d.duration || 0), 0)
          }
          
          return {
            ...session,
            duration: totalDuration,
            activityBreakdown
          }
        })

        setSessions(sessionsWithDurations || [])
        setTeachBacks(teachBackData || [])
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [session?.user?.id])

  const aggregatedData = aggregateSessions(sessions, period)
  const metrics = calculateSummaryMetrics(sessions, aggregatedData, teachBacks)

  // Calculate activity breakdown totals (in minutes)
  const activityTotals = sessions.reduce((totals, session) => ({
    module: totals.module + Math.round((session.activityBreakdown?.module || 0) / 60),
    teach_back: totals.teach_back + Math.round((session.activityBreakdown?.teach_back || 0) / 60),
    flashcards: totals.flashcards + Math.round((session.activityBreakdown?.flashcards || 0) / 60)
  }), { module: 0, teach_back: 0, flashcards: 0 })

  const hasTeachBackAnalytics = subscriptionTier === 'basic' || subscriptionTier === 'pro'

  // Show loading state while checking auth
  if (isLoadingAuth) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  // Don't render anything if not authenticated (will redirect)
  if (!session) {
    return null
  }

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">Loading your insights...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-8 max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Learning Insights</h1>
          <p className="text-text-light mt-2">Track your study progress and performance over time</p>
        </div>

        {/* Time Period Filters */}
        <div className="flex gap-4 mb-8">
          {(['day', 'week', 'month'] as TimePeriod[]).map(p => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-light">Total Study Time</p>
                <p className="text-2xl font-bold text-text mt-1">
                  {Math.round(metrics.totalStudyTime)} mins
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-blue-500">📚 Modules: {activityTotals.module} mins</p>
                  <p className="text-green-500">🎓 Teach-Back: {activityTotals.teach_back} mins</p>
                  <p className="text-purple-500">🔄 Flashcards: {activityTotals.flashcards} mins</p>
                </div>
              </div>
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-light">Total Sessions</p>
                <p className="text-2xl font-bold text-text mt-1">
                  {metrics.sessionCount}
                </p>
                {metrics.teachBack && (
                  <p className="text-sm text-text-light mt-2">
                    Including {metrics.teachBack.totalSessions} teach-back sessions
                  </p>
                )}
              </div>
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-light">Average Duration</p>
                <p className="text-2xl font-bold text-text mt-1">
                  {Math.round(metrics.avgSessionDuration)} mins
                </p>
                {metrics.improvement && (
                  <div className="flex items-center mt-2 text-sm">
                    {metrics.improvement > 0 ? (
                      <>
                        <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-green-500">{Math.round(metrics.improvement)}% from last {period}</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                        <span className="text-red-500">{Math.round(Math.abs(metrics.improvement))}% from last {period}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </Card>
        </div>

        {/* Teach-Back Metrics */}
        {metrics.teachBack && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Teach-Back Performance</h2>
            {hasTeachBackAnalytics ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-text-light">Overall Grade</p>
                      <p className="text-2xl font-bold text-text mt-1">
                        {Math.round(metrics.teachBack.averageGrade)}%
                      </p>
                      {metrics.teachBack.improvement && (
                        <div className="flex items-center mt-2 text-sm">
                          {metrics.teachBack.improvement > 0 ? (
                            <>
                              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-green-500">{Math.round(metrics.teachBack.improvement)}% improvement</span>
                            </>
                          ) : (
                            <>
                              <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                              <span className="text-red-500">{Math.round(Math.abs(metrics.teachBack.improvement))}% decrease</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-text-light">Session Frequency</p>
                      <p className="text-2xl font-bold text-text mt-1">
                        {metrics.teachBack.sessionFrequency.toFixed(1)} / {period}
                      </p>
                    </div>
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div>
                    <p className="text-sm text-text-light mb-2">Component Scores</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Clarity</span>
                          <span className="font-medium">{Math.round(metrics.teachBack.averageClarity)}/10</span>
                        </div>
                        <div className="h-2 bg-blue-100 rounded-full mt-1">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${metrics.teachBack.averageClarity * 10}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Completeness</span>
                          <span className="font-medium">{Math.round(metrics.teachBack.averageCompleteness)}/10</span>
                        </div>
                        <div className="h-2 bg-green-100 rounded-full mt-1">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${metrics.teachBack.averageCompleteness * 10}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Correctness</span>
                          <span className="font-medium">{Math.round(metrics.teachBack.averageCorrectness)}/10</span>
                        </div>
                        <div className="h-2 bg-purple-100 rounded-full mt-1">
                          <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${metrics.teachBack.averageCorrectness * 10}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="bg-background-card rounded-xl p-8 border border-border">
                <div className="flex items-center gap-4">
                  <Lock className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Premium Feature</h3>
                    <p className="text-text-light mb-4">
                      Upgrade to Basic or Pro to unlock detailed teach-back analytics and track your learning progress.
                    </p>
                    <UpgradeBanner type="study" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Study Time Chart */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Study Time Trends</h2>
          <StudyTimeChart aggregatedData={aggregatedData} />
        </div>

        {/* Teach-Back Chart */}
        {teachBacks.length > 0 && hasTeachBackAnalytics && (
          <div>
            <h2 className="text-xl font-bold mb-4">Teach-Back Grade Trends</h2>
            <TeachBackChart teachBacks={teachBacks} period={period} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
} 