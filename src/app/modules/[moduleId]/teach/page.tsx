'use client'

import { useState, useEffect } from 'react'
import TextEditor from '@/components/teach/TextEditor'
import AudioRecorder from '@/components/teach/AudioRecorder'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { UsageIndicator } from '@/components/subscription/UsageIndicator'
import { checkAndIncrementUsage } from '@/utils/usage-limits'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { UpgradeBanner } from '@/components/subscription/UpgradeBanner'
import { useStudyDuration } from '@/hooks/useStudyDuration'

interface GradingResult {
  grade: number
  feedback: {
    clarity: { score: number, feedback: string }
    completeness: { score: number, feedback: string }
    correctness: { score: number, feedback: string }
  }
}

interface PageProps {
  params: Promise<{ moduleId: string }>
}

export default function TeachPage({ params }: PageProps) {
  const router = useRouter()
  const { moduleId } = use(params)
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const { teach_back: teachBackUsage, isLoading: isLoadingUsage, error: usageError } = useUsageLimits()
  
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [moduleContent, setModuleContent] = useState('')
  const [moduleTitle, setModuleTitle] = useState('')
  const [submissionTimestamp, setSubmissionTimestamp] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  
  // Track study duration
  useStudyDuration(studySessionId || '', 'teach_back')

  useEffect(() => {
    // Fetch module details when component mounts
    const fetchModuleDetails = async () => {
      const supabase = createClient()
      try {
        const { data: studySession, error } = await supabase
          .from('study_sessions')
          .select('id, details')
          .eq('module_title', moduleId)
          .single()

        if (error) {
          console.error('Error fetching module details:', error)
          throw error
        }

        setStudySessionId(studySession.id)
        setModuleTitle(studySession.details.title)
        setModuleContent(studySession.details.content)
      } catch (error) {
        console.error('Error fetching module details:', error)
      }
    }

    fetchModuleDetails()
  }, [moduleId])

  const gradeExplanation = async (explanation: string, moduleContent: string): Promise<GradingResult> => {
    const prompt = `
      Grade the following explanation of a concept based on these criteria:
      
      1. Clarity (0-10): Is the explanation clear and easy to understand?
      2. Completeness (0-10): Does it cover all key points from the original content?
      3. Correctness (0-10): Are the facts and reasoning accurate?
      
      Original content to be explained:
      ${moduleContent}
      
      Student's explanation:
      ${explanation}
      
      Please provide:
      1. A score for each criterion (0-10)
      2. Brief feedback for each criterion
      3. An overall grade (0-100) calculated as: (clarity + completeness + correctness) * 3.33
      
      Format your response as a JSON object with this structure:
      {
        "grade": number,
        "feedback": {
          "clarity": { "score": number, "feedback": "string" },
          "completeness": { "score": number, "feedback": "string" },
          "correctness": { "score": number, "feedback": "string" }
        }
      }
    `

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) {
        throw new Error('Grading failed')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error grading explanation:', error)
      return {
        grade: 70,
        feedback: {
          clarity: { score: 7, feedback: "AI grading unavailable. Default score provided." },
          completeness: { score: 7, feedback: "AI grading unavailable. Default score provided." },
          correctness: { score: 7, feedback: "AI grading unavailable. Default score provided." }
        }
      }
    }
  }

  const handleSubmit = async () => {
    if (isLoadingAuth || !session?.user?.id) {
      console.error('No authenticated user')
      return
    }

    if (teachBackUsage.isLimited) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const supabase = createClient()

      // Check and increment usage
      const { allowed, error: usageError } = await checkAndIncrementUsage(session.user.id, 'teach_back')
      
      if (!allowed) {
        throw new Error(usageError)
      }

      // Get the study session ID
      const { data: studySession, error: sessionError } = await supabase
        .from('study_sessions')
        .select('id')
        .eq('module_title', moduleId)
        .single()

      let studySessionId = studySession?.id

      // If no study session exists, create one
      if (!studySession && sessionError?.code === 'PGRST116') {
        const { data: newSession, error: createSessionError } = await supabase
          .from('study_sessions')
          .insert({
            user_id: session.user.id,
            module_title: moduleId,
            details: {
              title: moduleTitle,
              content: moduleContent
            }
          })
          .select()
          .single()

        if (createSessionError) {
          throw new Error('Failed to create study session')
        }

        studySessionId = newSession.id
      } else if (sessionError) {
        throw new Error('Error fetching study session')
      }

      // Grade the explanation first
      const gradingResult = await gradeExplanation(text, moduleContent)

      // Create a new teach back entry with the grading results
      const { data: newTeachBack, error: createError } = await supabase
        .from('teach_backs')
        .insert({
          study_session_id: studySessionId,
          user_id: session.user.id,
          content: text,
          grade: gradingResult.grade,
          feedback: {
            clarity: gradingResult.feedback.clarity,
            completeness: gradingResult.feedback.completeness,
            correctness: gradingResult.feedback.correctness
          }
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Use the server-generated timestamp
      setSubmissionTimestamp(newTeachBack.created_at)
      setShowOptions(true)
      
    } catch (error) {
      console.error('Error saving teach-back:', error)
      setShowOptions(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTranscription = (transcribedText: string) => {
    setText(currentText => {
      const separator = currentText ? '\n\n' : ''
      return currentText + separator + transcribedText
    })
  }

  const handleViewResults = () => {
    if (!submissionTimestamp) {
      console.error('No submission timestamp found')
      return
    }
    router.push(`/modules/${moduleId}/teach/results?timestamp=${encodeURIComponent(submissionTimestamp)}`)
  }

  if (isLoadingAuth || isLoadingUsage) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect in useRequireAuth
  }

  if (usageError) {
    return <div className="flex justify-center items-center min-h-screen">Error: {usageError}</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Show banner if user is on free plan */}
          {teachBackUsage.limit === 10 && !teachBackUsage.isLimited && (
            <UpgradeBanner type="study" />
          )}

          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href={`/modules/${moduleId}`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Module
                </Button>
              </Link>
            </div>
            <h2 className="text-sm font-medium text-text-light mb-2">Teaching Back</h2>
            <h1 className="text-3xl font-bold text-text">{moduleTitle}</h1>
          </div>

          {/* Usage Indicator */}
          <div className="mb-8">
            <UsageIndicator
              current={teachBackUsage.current}
              limit={teachBackUsage.limit}
              isLimited={teachBackUsage.isLimited}
              type="teach_back"
            />
          </div>

          <div className="bg-background-card rounded-xl shadow-sm border border-border p-8 mb-8">
            <div className="bg-background/50 dark:bg-background/10 p-4 rounded-lg border border-border mb-8">
              <h2 className="font-semibold mb-2 text-text">🎓 Feynman Technique Tips:</h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-text-light">
                <li>Explain the concept as if teaching it to a complete beginner</li>
                <li>Use simple language and avoid jargon</li>
                <li>Identify gaps in your understanding and note them down</li>
                <li>Connect ideas to things you already know</li>
              </ul>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-text">✍️ Your Explanation</h2>
                  <AudioRecorder 
                    onTranscriptionComplete={handleTranscription}
                    disabled={teachBackUsage.isLimited}
                  />
                </div>
                <p className="text-sm text-text-light mb-4">
                  Type your explanation or use voice recording - both will appear in the text editor below
                </p>
                <TextEditor
                  value={text}
                  onChange={setText}
                  disabled={teachBackUsage.isLimited}
                />
              </div>
            </div>

            {!showOptions ? (
              <div className="mt-8 flex justify-end">
                <Button 
                  onClick={handleSubmit} 
                  size="lg"
                  disabled={isSubmitting || teachBackUsage.isLimited || !text.trim()}
                >
                  {isSubmitting ? 'Grading your explanation...' : 'Submit Teach-Back Session'}
                </Button>
              </div>
            ) : (
              <div className="mt-8 flex justify-end">
                <Button onClick={handleViewResults}>
                  View Results
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add the upgrade modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="teach_back"
        currentUsage={teachBackUsage.current}
        limit={teachBackUsage.limit}
      />

      <Footer />
    </div>
  )
} 