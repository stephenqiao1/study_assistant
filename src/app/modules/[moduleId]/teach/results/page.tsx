'use client'

import { useEffect, useState, use } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter as _CardFooter } from '@/components/ui/card'
import { CheckCircle, BookOpen, AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface TeachBackResult {
  grade: number
  timestamp: string
  explanation: {
    text: string
  }
  feedback: {
    clarity: { score: number, feedback: string }
    completeness: { score: number, feedback: string }
    correctness: { score: number, feedback: string }
  }
}

interface ResultsPageProps {
  params: Promise<{ moduleId: string }>
}

export default function ResultsPage({ params }: ResultsPageProps) {
  // Unwrap the params Promise with React.use()
  const resolvedParams = use(params);
  const { moduleId } = resolvedParams;
  
  const [result, setResult] = useState<TeachBackResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [moduleTitle, setModuleTitle] = useState('')
  const searchParams = useSearchParams()
  const timestamp = searchParams.get('timestamp')
  const { session } = useRequireAuth()

  useEffect(() => {
    const fetchResults = async () => {
      if (!moduleId || !timestamp || !session?.user?.id) {
        setIsLoading(false)
        return
      }

      try {
        const supabase = await createClient()
        
        // Check if moduleId is a valid UUID
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId);
        
        if (!isValidUuid) {
          console.error('Invalid module ID format:', moduleId);
          setIsLoading(false);
          return;
        }
        
        // Get module information using moduleId as the study_session_id
        const { data: moduleData, error: moduleError } = await supabase
          .from('study_sessions')
          .select('module_title, details')
          .eq('id', moduleId)
          .single()
          
        if (moduleError) {
          console.error('Error fetching module data:', moduleError);
        }
          
        if (moduleData) {
          setModuleTitle(moduleData.details?.title || moduleData.module_title || 'Untitled Module')
        }
        
        // Get the teach back within a small time window of the target timestamp
        const targetTime = new Date(decodeURIComponent(timestamp))
        const startTime = new Date(targetTime.getTime() - 1000) // 1 second before
        const endTime = new Date(targetTime.getTime() + 1000)   // 1 second after

        const { data: teachBack, error: teachBackError } = await supabase
          .from('teach_backs')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('study_session_id', moduleId) // Use the moduleId as the study_session_id
          .gte('created_at', startTime.toISOString())
          .lte('created_at', endTime.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (teachBackError) {
          console.error('Error fetching teach back:', teachBackError)
          return
        }

        if (teachBack) {
          const defaultFeedback = {
            clarity: { score: 0, feedback: "Pending evaluation" },
            completeness: { score: 0, feedback: "Pending evaluation" },
            correctness: { score: 0, feedback: "Pending evaluation" }
          }

          setResult({
            grade: teachBack.grade || 0,
            timestamp: teachBack.created_at,
            explanation: {
              text: teachBack.content
            },
            feedback: {
              ...defaultFeedback,
              ...(teachBack.feedback || {})
            }
          })
        } else {
        }
      } catch (error) {
        console.error('Error fetching results:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [moduleId, timestamp, session?.user?.id])

  // Helper to get grade color
  const getGradeColor = (score: number) => {
    if (score >= 90) return "text-green-500 dark:text-green-400";
    if (score >= 75) return "text-blue-500 dark:text-blue-400";
    if (score >= 60) return "text-amber-500 dark:text-amber-400";
    return "text-red-500 dark:text-red-400";
  }
  
  // Helper to get grade label
  const getGradeLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 60) return "Satisfactory";
    if (score >= 50) return "Needs Improvement";
    return "Needs Significant Work";
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-blue-500"; 
    if (score >= 4) return "bg-amber-500";
    return "bg-red-500";
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-4xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center h-[50vh]">
            <div className="text-center animate-pulse">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-primary/40" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Loading results...</h3>
              <p className="text-muted-foreground">Retrieving your teach-back evaluation</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-4xl mx-auto px-4 py-16">
          <div className="text-center py-16 bg-background-card rounded-lg shadow-sm border border-border p-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
            <h1 className="text-2xl font-bold mb-4">Results Not Found</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              We couldn't find the teach-back session you're looking for. It may have been deleted or the link might be invalid.
            </p>
            <Link href={`/modules/${moduleId}`}>
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Module
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container max-w-4xl mx-auto px-4 py-16">
        <div>
          <div className="mb-8">
            <Link href={`/modules/${moduleId}?title=${encodeURIComponent(moduleTitle)}`}>
              <Button variant="outline" size="sm" className="mb-3">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Module
              </Button>
            </Link>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-text-light flex items-center gap-1 mb-1">
                  <BookOpen className="h-4 w-4" />
                  {moduleTitle}
                </h2>
                <h1 className="text-3xl font-bold">Teach-Back Results</h1>
              </div>
              <div className="flex flex-col items-center md:items-end">
                <div className={`text-5xl font-bold ${getGradeColor(result.grade)}`}>
                  {Math.round(result.grade)}
                </div>
                <div className="text-sm text-muted-foreground">/100 Points</div>
                <Badge 
                  className="mt-2 px-3 py-1"
                  variant={result.grade >= 70 ? "default" : "secondary"}
                >
                  {getGradeLabel(result.grade)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            {/* Clarity Feedback */}
            <Card className="bg-background-card shadow-sm border-border overflow-hidden">
              <CardHeader className="border-b border-border pb-3 bg-background/50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Clarity</CardTitle>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={result.feedback.clarity.score * 10} 
                      max={100} 
                      className="w-24 h-2" 
                      indicatorClassName={getScoreColor(result.feedback.clarity.score)}
                    />
                    <span className="text-lg font-semibold">{result.feedback.clarity.score}<span className="text-xs text-muted-foreground">/10</span></span>
                  </div>
                </div>
                <CardDescription>How clearly you explained the concept</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-text">
                  {result.feedback.clarity.feedback}
                </p>
              </CardContent>
            </Card>

            {/* Completeness Feedback */}
            <Card className="bg-background-card shadow-sm border-border overflow-hidden">
              <CardHeader className="border-b border-border pb-3 bg-background/50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Completeness</CardTitle>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={result.feedback.completeness.score * 10} 
                      max={100} 
                      className="w-24 h-2" 
                      indicatorClassName={getScoreColor(result.feedback.completeness.score)}
                    />
                    <span className="text-lg font-semibold">{result.feedback.completeness.score}<span className="text-xs text-muted-foreground">/10</span></span>
                  </div>
                </div>
                <CardDescription>How thoroughly you covered the topic</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-text">
                  {result.feedback.completeness.feedback}
                </p>
              </CardContent>
            </Card>

            {/* Correctness Feedback */}
            <Card className="bg-background-card shadow-sm border-border overflow-hidden">
              <CardHeader className="border-b border-border pb-3 bg-background/50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Correctness</CardTitle>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={result.feedback.correctness.score * 10} 
                      max={100} 
                      className="w-24 h-2" 
                      indicatorClassName={getScoreColor(result.feedback.correctness.score)}
                    />
                    <span className="text-lg font-semibold">{result.feedback.correctness.score}<span className="text-xs text-muted-foreground">/10</span></span>
                  </div>
                </div>
                <CardDescription>Accuracy of the information presented</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-text">
                  {result.feedback.correctness.feedback}
                </p>
              </CardContent>
            </Card>

            {/* Your Explanation */}
            <Card className="bg-background-card shadow-sm border-border overflow-hidden">
              <CardHeader className="border-b border-border pb-3 bg-background/50">
                <CardTitle className="text-lg">Your Explanation</CardTitle>
                <CardDescription>The content you submitted for evaluation</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="prose dark:prose-invert max-w-none" 
                    dangerouslySetInnerHTML={{ __html: result.explanation.text }} 
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4 mt-10">
            <Link href={`/modules/${moduleId}?title=${encodeURIComponent(moduleTitle)}`}>
              <Button variant="outline" className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Module
              </Button>
            </Link>
            <Link href={`/modules/${moduleId}/teach`}>
              <Button className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
} 