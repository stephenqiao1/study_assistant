'use client'

import { useEffect, useState, use } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { useRequireAuth } from '@/hooks/useRequireAuth'

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
  const [result, setResult] = useState<TeachBackResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [moduleContent, setModuleContent] = useState<string>('')
  const searchParams = useSearchParams()
  const timestamp = searchParams.get('timestamp')
  const { moduleId } = use(params)
  const { session } = useRequireAuth()

  useEffect(() => {
    async function fetchResults() {
      if (!moduleId || !timestamp || !session?.user?.id) {
        setIsLoading(false)
        return
      }

      const supabase = createClient()
      
      try {
        // Get the teach back within a small time window of the target timestamp
        const targetTime = new Date(decodeURIComponent(timestamp))
        const startTime = new Date(targetTime.getTime() - 1000) // 1 second before
        const endTime = new Date(targetTime.getTime() + 1000)   // 1 second after

        const { data: teachBack, error: teachBackError } = await supabase
          .from('teach_backs')
          .select('*')
          .eq('user_id', session.user.id)
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
          console.log('No teach back found')
        }

        // Get study session content after we confirm we have a teach back
        const { data: studySession, error: sessionError } = await supabase
          .from('study_sessions')
          .select('details')
          .eq('module_title', moduleId)
          .single()

        if (sessionError) {
          console.error('Error fetching study session:', sessionError)
        } else {
          setModuleContent(studySession.details.content)
        }
      } catch (error) {
        console.error('Error fetching results:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [moduleId, timestamp, session?.user?.id])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading results...</div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Results Not Found</h1>
          <Link href={`/modules/${moduleId}`}>
            <Button>Return to Module</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Teach-Back Results</h1>
          <div className="text-6xl font-bold mb-4">
            {result.grade}
            <span className="text-2xl text-gray-500">/100</span>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          {/* Clarity Feedback */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Clarity</h2>
              <div className="text-2xl font-bold">
                {result.feedback.clarity.score}
                <span className="text-base text-gray-500">/10</span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {result.feedback.clarity.feedback}
            </p>
          </div>

          {/* Completeness Feedback */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Completeness</h2>
              <div className="text-2xl font-bold">
                {result.feedback.completeness.score}
                <span className="text-base text-gray-500">/10</span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {result.feedback.completeness.feedback}
            </p>
          </div>

          {/* Correctness Feedback */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Correctness</h2>
              <div className="text-2xl font-bold">
                {result.feedback.correctness.score}
                <span className="text-base text-gray-500">/10</span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {result.feedback.correctness.feedback}
            </p>
          </div>

          {/* Your Explanation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Your Explanation</h2>
            <div className="prose dark:prose-invert max-w-none" 
                 dangerouslySetInnerHTML={{ __html: result.explanation.text }} 
            />
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <Link href={`/modules/${moduleId}`}>
            <Button variant="outline">Return to Module</Button>
          </Link>
          <Link href={`/modules/${moduleId}/teach`}>
            <Button>Try Again</Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 