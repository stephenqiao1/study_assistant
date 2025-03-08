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
import { ArrowUp, ArrowDown, Clock, BookOpen, TrendingUp, Brain, Target, BarChart, Calendar, History } from 'lucide-react'
import type { Flashcard } from '@/utils/aggregateSessions'

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

// Define extended TeachBackMetrics interface with optional extra properties
interface ExtendedTeachBackMetrics {
  averageGrade?: number;
  improvement?: number;
  topTopic?: string;
  topTopicCount?: number;
  totalSessions?: number;
  sessionFrequency?: number;
}

export default function LearningInsights() {
  const _router = useRouter()
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const [period, setPeriod] = useState<TimePeriod>('week')
  const [sessions, setSessions] = useState<SessionWithDurations[]>([])
  const [teachBacks, setTeachBacks] = useState<TeachBackSession[]>([])
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'pro'>('free')

  // The useRequireAuth hook already handles redirection to login if not authenticated
  // No need for additional redirect logic here

  useEffect(() => {
    // Fetch data when component mounts
    const fetchStudyData = async () => {
      if (!session?.user?.id) return
      
      setIsLoading(true)
      const supabase = await createClient()
      
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
        
        // Fetch flashcards
        const { data: flashcardsData, error: flashcardsError } = await supabase
          .from('flashcards')
          .select('*')
          .in('module_title', sessionsData.map(s => s.module_title))
          .order('last_reviewed_at', { ascending: false })

        if (flashcardsError) throw flashcardsError

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
        setFlashcards(flashcardsData || [])
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setIsLoading(false)
      }
    }

    fetchStudyData()
  }, [session?.user?.id])

  const aggregatedData = aggregateSessions(sessions, period)
  const metrics = calculateSummaryMetrics(sessions, aggregatedData, teachBacks, flashcards)

  // Filter sessions based on selected time period
  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.started_at);
    const now = new Date();
    
    if (period === 'day') {
      // Last 24 hours
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return sessionDate >= yesterday;
    } else if (period === 'week') {
      // Last 7 days
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 7);
      return sessionDate >= lastWeek;
    } else if (period === 'month') {
      // Last 30 days
      const lastMonth = new Date(now);
      lastMonth.setDate(now.getDate() - 30);
      return sessionDate >= lastMonth;
    }
    return true;
  });

  // Calculate period-specific metrics
  const totalStudyTime = filteredSessions.reduce((sum, session) => sum + Math.round((session.duration || 0) / 60), 0);
  const sessionCount = filteredSessions.length;
  const avgSessionDuration = sessionCount > 0 ? Math.round(totalStudyTime / sessionCount) : 0;

  // Calculate activity breakdown totals for filtered sessions (in minutes)
  const activityTotals = filteredSessions.reduce((totals, session) => ({
    module: totals.module + Math.round((session.activityBreakdown?.module || 0) / 60),
    teach_back: totals.teach_back + Math.round((session.activityBreakdown?.teach_back || 0) / 60),
    flashcards: totals.flashcards + Math.round((session.activityBreakdown?.flashcards || 0) / 60)
  }), { module: 0, teach_back: 0, flashcards: 0 })

  const hasTeachBackAnalytics = subscriptionTier === 'basic' || subscriptionTier === 'pro'
  const _hasFlashcardAnalytics = subscriptionTier === 'basic' || subscriptionTier === 'pro'

  // Show loading state while checking auth
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse">
          <div className="h-6 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    )
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
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading your insights...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning Insights</h1>
              <p className="text-gray-700 dark:text-gray-200 mt-2">Track your study progress and performance over time</p>
            </div>

            {/* Time Period Filters */}
            <div className="mt-4 md:mt-0 flex gap-2 bg-background-card p-1 rounded-lg border border-border">
              {(['day', 'week', 'month'] as TimePeriod[]).map(p => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className={period === p ? '' : 'text-gray-500 dark:text-gray-400'}
                >
                  {p === 'day' && <History className="h-4 w-4 mr-1" />}
                  {p === 'week' && <Calendar className="h-4 w-4 mr-1" />}
                  {p === 'month' && <Calendar className="h-4 w-4 mr-1" />}
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Insight Cards - Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 border-l-4 border-l-blue-500 dark:border-l-blue-400">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center">
                    <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400 mr-2" />
                    Total Study Time
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {totalStudyTime} mins
                  </p>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 mr-2"></div>
                      <p className="text-gray-600 dark:text-gray-300">Modules: <span className="font-medium">{activityTotals.module} mins</span></p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mr-2"></div>
                      <p className="text-gray-600 dark:text-gray-300">Teach-Back: <span className="font-medium">{activityTotals.teach_back} mins</span></p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 mr-2"></div>
                      <p className="text-gray-600 dark:text-gray-300">Flashcards: <span className="font-medium">{activityTotals.flashcards} mins</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-green-500 dark:border-l-green-400">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center">
                    <BookOpen className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                    Total Sessions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {sessionCount}
                  </p>
                  {metrics.teachBack && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mr-2"></div>
                      Including {metrics.teachBack.totalSessions} teach-back sessions
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-purple-500 dark:border-l-purple-400">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center">
                    <TrendingUp className="h-4 w-4 text-purple-500 dark:text-purple-400 mr-2" />
                    Average Duration
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {avgSessionDuration} mins
                  </p>
                  {metrics.improvement && (
                    <div className="mt-3">
                      <div className="flex items-center text-sm">
                        {metrics.improvement > 0 ? (
                          <div className="flex items-center px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded">
                            <ArrowUp className="h-3 w-3 mr-1" />
                            <span>{Math.round(metrics.improvement)}% from last {period}</span>
                          </div>
                        ) : (
                          <div className="flex items-center px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
                            <ArrowDown className="h-3 w-3 mr-1" />
                            <span>{Math.round(Math.abs(metrics.improvement))}% from last {period}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        {/* Data Visualization Section */}
        <section className="mb-14">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <BarChart className="h-5 w-5 text-primary mr-2" />
              Learning Trends & Visualizations
            </h2>
          </div>
          
          {/* Main Chart Area - Study Time Trends */}
          <div className="mb-8">
            <div className="bg-background-card rounded-xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mr-3">
                      <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Study Time Distribution</h3>
                  </div>
                  <div className="mt-2 sm:mt-0 text-sm text-gray-500 dark:text-gray-400">
                    {period === 'day' ? 'Last 24 hours' : period === 'week' ? 'Last 7 days' : 'Last 30 days'}
                  </div>
                </div>
              </div>
              <div className="p-4 h-72">
                <StudyTimeChart aggregatedData={aggregatedData} />
              </div>
            </div>
          </div>
          
          {/* TeachBack Performance Chart */}
          {hasTeachBackAnalytics && metrics.teachBack && teachBacks.length > 0 ? (
            <div className="bg-background-card rounded-xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mr-3">
                      <Brain className="h-4 w-4 text-green-500 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Teach-Back Performance</h3>
                  </div>
                  <div className="mt-2 sm:mt-0 sm:flex sm:items-center gap-4">
                    <div className="flex items-center bg-background/50 px-2 py-1 rounded text-sm">
                      <span className="text-gray-700 dark:text-gray-300 mr-2">Avg. Grade:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{Math.round(metrics.teachBack?.averageGrade || 0)}%</span>
                    </div>
                    {metrics.teachBack?.improvement !== undefined && (
                      <div className="flex items-center">
                        <span className="text-gray-700 dark:text-gray-300 mr-2">Trend:</span>
                        {metrics.teachBack?.improvement > 0 ? (
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <ArrowUp className="h-3 w-3 mr-1" />
                            <span>{Math.round(metrics.teachBack?.improvement)}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600 dark:text-red-400">
                            <ArrowDown className="h-3 w-3 mr-1" />
                            <span>{Math.round(Math.abs(metrics.teachBack?.improvement || 0))}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 h-72">
                <TeachBackChart teachBacks={teachBacks} period={period} />
              </div>
            </div>
          ) : hasTeachBackAnalytics ? (
            <div className="bg-background-card rounded-xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mr-3">
                    <Brain className="h-4 w-4 text-green-500 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Teach-Back Performance</h3>
                </div>
              </div>
              <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">You haven't completed any teach-back sessions yet.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Use the teach-back feature to improve your recall and understanding.</p>
              </div>
            </div>
          ) : null}
        </section>
        
        {/* Detailed Metrics Sections */}
        {metrics.teachBack && (
          <section className="mb-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <Target className="h-5 w-5 text-primary mr-2" />
                Detailed Performance Metrics
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h3 className="font-semibold flex items-center">
                    <Brain className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                    Teach-Back Grade
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-baseline mt-1">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {Math.round(metrics.teachBack?.averageGrade || 0)}%
                        </p>
                      </div>
                      {metrics.teachBack?.improvement !== undefined && (
                        <div className="mt-2">
                          {metrics.teachBack?.improvement > 0 ? (
                            <div className="inline-flex items-center text-sm px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded">
                              <ArrowUp className="h-3 w-3 mr-1" />
                              <span>{Math.round(metrics.teachBack?.improvement)}% improvement</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center text-sm px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
                              <ArrowDown className="h-3 w-3 mr-1" />
                              <span>{Math.round(Math.abs(metrics.teachBack?.improvement || 0))}% decrease</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h3 className="font-semibold flex items-center">
                    <Brain className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                    Teach-Back Frequency
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-baseline mt-1">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {metrics.teachBack?.sessionFrequency?.toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          per {period}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        Total: {metrics.teachBack?.totalSessions} sessions
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h3 className="font-semibold flex items-center">
                    <Brain className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                    Top Teach-Back Topic
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <div>
                      {metrics.teachBack && 'topTopic' in metrics.teachBack && metrics.teachBack.topTopic ? (
                        <>
                          <p className="text-lg font-medium text-gray-900 dark:text-white line-clamp-2">
                            {(metrics.teachBack as ExtendedTeachBackMetrics).topTopic}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                            {(metrics.teachBack as ExtendedTeachBackMetrics).topTopicCount} sessions
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Not enough data yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
} 