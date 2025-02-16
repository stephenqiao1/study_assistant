'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { BookOpen, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Session {
  id: string
  created_at: string
  module_id: string
  module_title: string
  grade: number
  duration: number
}

interface AnalyticsData {
  date: string
  averageGrade: number
  sessionsCount: number
}

interface RawSession {
  id: string
  created_at: string
  module_id: string
  details: {
    title: string
    teach_backs?: Array<{
      grade: number
      duration: number
    }>
  }
}

export default function DashboardPage() {
  const { session, isLoading } = useRequireAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  const supabase = createClient()

  const fetchSessions = async () => {
    try {
      const { data: rawData, error } = await supabase
        .from('study_sessions')
        .select(`
          id,
          created_at,
          module_id,
          details,
          session_type
        `)
        .eq('session_type', 'text')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedSessions = (rawData as unknown as RawSession[]).map(session => ({
        id: session.id,
        created_at: session.created_at,
        module_id: session.module_id,
        module_title: session.details.title,
        grade: session.details.teach_backs?.[0]?.grade || 0,
        duration: session.details.teach_backs?.[0]?.duration || 0
      }))

      setSessions(formattedSessions)
      processAnalyticsData(formattedSessions)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const processAnalyticsData = (sessionData: Session[]) => {
    const groupedByDate = sessionData.reduce((acc: { [key: string]: Session[] }, session) => {
      const date = format(parseISO(session.created_at), 'yyyy-MM-dd')
      if (!acc[date]) acc[date] = []
      acc[date].push(session)
      return acc
    }, {})

    const analytics = Object.entries(groupedByDate).map(([date, dateSessions]) => ({
      date,
      averageGrade: Number((dateSessions.reduce((sum, s) => sum + s.grade, 0) / dateSessions.length).toFixed(2)),
      sessionsCount: dateSessions.length
    }))

    setAnalyticsData(analytics.sort((a, b) => a.date.localeCompare(b.date)))
  }

  useEffect(() => {
    fetchSessions()

    const subscription = supabase
      .channel('sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchSessions)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const calculateMetrics = () => {
    if (sessions.length === 0) return { total: 0, avgGrade: 0, streak: 0 }

    const total = sessions.length
    const avgGrade = Number((sessions.reduce((sum, s) => sum + s.grade, 0) / total).toFixed(2))
    
    // Calculate streak
    let streak = 0
    let currentDate = new Date()
    const sessionDates = new Set(sessions.map(s => format(parseISO(s.created_at), 'yyyy-MM-dd'))
    )
    
    while (sessionDates.has(format(currentDate, 'yyyy-MM-dd'))) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    }

    return { total, avgGrade, streak }
  }

  const metrics = calculateMetrics()

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect in useRequireAuth
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header & Navigation */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-primary">
                Academiq
              </span>
            </Link>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/dashboard" className="text-primary">Dashboard</Link>
              <Link href="/modules" className="text-text hover:text-primary">Modules</Link>
              <Button 
                variant="ghost" 
                className="text-text hover:text-primary flex items-center gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-text">Your Learning Dashboard</h1>
          </div>
          
          {/* Metrics Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-white hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-text">Average Grade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-accent-orange">{metrics.avgGrade}%</div>
                <p className="text-text-light mt-2">Overall performance</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-text">Active Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-accent-teal">{metrics.streak}</div>
                <p className="text-text-light mt-2">Consecutive days learning</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <Tabs defaultValue="analytics" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="history">Session History</TabsTrigger>
              </TabsList>

              <TabsContent value="analytics">
                <div>
                  <h2 className="text-xl font-semibold text-text mb-4">Performance Over Time</h2>
                  <div className="h-[400px] bg-white rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                          stroke="#666666"
                        />
                        <YAxis stroke="#666666" />
                        <Tooltip 
                          labelFormatter={(date) => format(parseISO(date as string), 'MMM d, yyyy')}
                          contentStyle={{ backgroundColor: 'white', borderRadius: '8px' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="averageGrade" 
                          name="Average Grade" 
                          stroke="#3A8FB7" 
                          activeDot={{ r: 8 }} 
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="sessionsCount" 
                          name="Sessions" 
                          stroke="#4DB6AC" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history">
                <div>
                  <h2 className="text-xl font-semibold text-text mb-4">Session History</h2>
                  <div className="bg-white rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-text">Date</TableHead>
                          <TableHead className="text-text">Module</TableHead>
                          <TableHead className="text-text">Grade</TableHead>
                          <TableHead className="text-text">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map((session) => (
                          <TableRow key={session.id} className="hover:bg-secondary transition-colors">
                            <TableCell className="text-text">
                              {format(parseISO(session.created_at), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="text-text">{session.module_title}</TableCell>
                            <TableCell className="text-text">
                              <span className="font-medium text-accent-orange">{session.grade}%</span>
                            </TableCell>
                            <TableCell className="text-text">{Math.round(session.duration / 60)} min</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
} 