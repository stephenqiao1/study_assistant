'use client'

import { useEffect, useState, use } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import ChatInterface from '@/components/chat/ChatInterface'

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
  conversation?: Array<{
    role: 'user' | 'assistant'
    content: string
    encouragement?: string
  }>
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

  useEffect(() => {
    async function fetchResults() {
      if (!moduleId || !timestamp) {
        setIsLoading(false)
        return
      }

      const supabase = createClient()
      
      try {
        // First get the study session ID
        const { data: studySession, error: sessionError } = await supabase
          .from('study_sessions')
          .select('id, details')
          .eq('module_title', moduleId)
          .single()

        if (sessionError) throw sessionError

        setModuleContent(studySession.details.content)

        // Get the teach back with matching timestamp
        const { data: teachBack, error: teachBackError } = await supabase
          .from('teach_backs')
          .select('*')
          .eq('study_session_id', studySession.id)
          .eq('created_at', decodeURIComponent(timestamp))
          .single()

        if (teachBackError) {
          console.error('Error fetching teach back:', teachBackError)
          return
        }

        if (teachBack) {
          setResult({
            grade: teachBack.grade,
            timestamp: teachBack.created_at,
            explanation: {
              text: teachBack.content
            },
            feedback: teachBack.feedback,
            conversation: teachBack.feedback.conversation
          })
        }
      } catch (error) {
        console.error('Error fetching results:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [moduleId, timestamp])

  const handleSaveConversation = async (conversation: TeachBackResult['conversation']) => {
    if (!result || !moduleId) return

    const supabase = createClient()
    
    try {
      // Get the study session ID
      const { data: studySession } = await supabase
        .from('study_sessions')
        .select('id')
        .eq('module_title', moduleId)
        .single()

      if (!studySession) return

      // Get the teach back
      const { data: teachBack } = await supabase
        .from('teach_backs')
        .select('id, feedback')
        .eq('study_session_id', studySession.id)
        .eq('created_at', result.timestamp)
        .single()

      if (!teachBack) return

      // Update the teach back with the new conversation
      const updatedFeedback = {
        ...teachBack.feedback,
        conversation
      }

      await supabase
        .from('teach_backs')
        .update({ feedback: updatedFeedback })
        .eq('id', teachBack.id)

    } catch (error) {
      console.error('Error saving conversation:', error)
    }
  }

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

        {/* Virtual Student Chat */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Virtual Student Discussion</h2>
          <ChatInterface
            initialMessage={result.explanation.text}
            originalContent={moduleContent}
            onSaveConversation={handleSaveConversation}
          />
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