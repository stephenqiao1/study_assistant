'use client'

import { useState, useEffect, use } from 'react'
import TextEditor from '@/components/teach/TextEditor'
import AudioRecorder from '@/components/teach/AudioRecorder'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, BookOpen, Lightbulb, PenLine, CheckCircle, Loader2 } from 'lucide-react'
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

interface _NoteType {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
  tags?: string[]
}

interface PageProps {
  params: Promise<{ moduleId: string }>
}

export default function TeachPage({ params }: PageProps) {
  // Unwrap the params Promise with React.use()
  const resolvedParams = use(params);
  const { moduleId } = resolvedParams;
  const router = useRouter()
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const { teach_back: teachBackUsage, isLoading: isLoadingUsage, error: usageError } = useUsageLimits()
  const searchParams = useSearchParams()
  const noteId = searchParams.get('noteId')
  
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [moduleTitle, setModuleTitle] = useState('')
  const [submissionTimestamp, setSubmissionTimestamp] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [sourceInfo, setSourceInfo] = useState<string | null>(null)
  const [noteTitle, setNoteTitle] = useState<string | null>(null)
  
  // Track study duration
  useStudyDuration(studySessionId || '', 'teach_back')

  // Check for content from notes
  useEffect(() => {
    // Check if there's content stored from notes
    if (typeof window !== 'undefined') {
      const savedContent = localStorage.getItem('teachBackContent')
      const sourceNote = localStorage.getItem('teachBackSource')
      
      if (savedContent) {
        setText(savedContent)
        setSourceInfo(sourceNote)
        
        // Clear the localStorage after using it
        localStorage.removeItem('teachBackContent')
        localStorage.removeItem('teachBackSource')
      }
    }
  }, [])

  useEffect(() => {
    // Fetch module details when component mounts
    const fetchModuleDetails = async () => {
      const supabase = await createClient()
      try {
        // Check if moduleId is a valid UUID
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId);
        
        if (!isValidUuid) {
          console.error('Invalid module ID format:', moduleId);
          throw new Error('Invalid module ID format');
        }
        
        // Using moduleId directly as the study_session_id
        const { data: studySession, error } = await supabase
          .from('study_sessions')
          .select('id, module_title, details')
          .eq('id', moduleId)
          .single()

        if (error) {
          console.error('Error fetching module details:', error)
          throw error
        }

        setStudySessionId(studySession.id)
        setModuleTitle(studySession.details?.title || studySession.module_title || 'Untitled Module')
        
        // If a noteId is provided, fetch the note content
        if (noteId) {
          const { data: note, error: noteError } = await supabase
            .from('notes')
            .select('*')
            .eq('id', noteId)
            .single()
            
          if (noteError) {
            console.error('Error fetching note:', noteError)
          } else if (note) {
            // Pre-populate the form with content from the note
            setText(note.content)
            setNoteTitle(note.title)
            setSourceInfo(`Note: ${note.title}`)
          }
        }
      } catch (error) {
        console.error('Error fetching module details:', error)
      }
    }

    fetchModuleDetails()
  }, [moduleId, noteId])

  const gradeExplanation = async (explanation: string): Promise<GradingResult> => {
    const prompt = `
      Grade the following explanation of a concept based on these criteria:
      
      1. Clarity (0-10): Is the explanation clear and easy to understand?
      2. Completeness (0-10): Does it cover all key points related to the topic?
      3. Correctness (0-10): Are the facts and reasoning accurate?
      
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
      const supabase = await createClient()

      // Check and increment usage
      const { allowed, error: usageError } = await checkAndIncrementUsage(session.user.id, 'teach_back')
      
      if (!allowed) {
        throw new Error(usageError)
      }

      // Use the already stored studySessionId if available
      let currentStudySessionId = studySessionId;
      
      // If we don't have a studySessionId yet, try to fetch it
      if (!currentStudySessionId) {
        // Check if moduleId is a valid UUID
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId);
        
        if (!isValidUuid) {
          throw new Error('Invalid module ID format');
        }
        
        // Get the study session by ID
        const { data: studySession, error: sessionError } = await supabase
          .from('study_sessions')
          .select('id')
          .eq('id', moduleId)
          .single()
  
        if (studySession) {
          currentStudySessionId = studySession.id;
        } else if (sessionError) {
          console.error('Error fetching study session:', sessionError);
          throw new Error('Error fetching study session');
        }
      }

      // If we still don't have a study session ID, create a new session
      if (!currentStudySessionId) {
        const { data: newSession, error: createSessionError } = await supabase
          .from('study_sessions')
          .insert({
            id: moduleId, // Use the moduleId as the session ID
            user_id: session.user.id,
            module_title: moduleTitle,
            details: {
              title: moduleTitle
            }
          })
          .select()
          .single()

        if (createSessionError) {
          console.error('Failed to create study session:', createSessionError);
          throw new Error('Failed to create study session');
        }

        currentStudySessionId = newSession.id;
      }

      // Grade the explanation
      const gradingResult = await gradeExplanation(text)

      // Create a new teach back entry with the grading results
      const { data: newTeachBack, error: createError } = await supabase
        .from('teach_backs')
        .insert({
          study_session_id: currentStudySessionId,
          user_id: session.user.id,
          content: text,
          source_note_id: noteId || null,
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

          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <Link href={`/modules/${moduleId}?title=${encodeURIComponent(moduleTitle)}`} className="inline-block mb-3">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Module
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-text mb-1">{moduleTitle}</h1>
              <div className="text-sm font-medium text-primary flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                Teaching Back
              </div>
              {sourceInfo && (
                <div className="mt-2 text-sm text-primary">
                  Content from {sourceInfo}
                </div>
              )}
            </div>
            
            {/* Usage Indicator */}
            <div className="md:text-right min-w-[200px]">
              <UsageIndicator
                current={teachBackUsage.current}
                limit={teachBackUsage.limit}
                isLimited={teachBackUsage.isLimited}
                type="teach_back"
              />
            </div>
          </div>

          {/* Display note reference banner if coming from a note */}
          {noteId && noteTitle && (
            <div className="mb-6 bg-primary/10 rounded-lg p-5 border border-primary/20 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-primary mt-0.5 bg-primary/10 p-2.5 rounded-full">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-1">Teaching from Note: <span className="text-primary">{noteTitle}</span></h3>
                  <p className="text-muted-foreground">
                    You're teaching based on your note. The content has been pre-filled for you,
                    but feel free to modify it to improve your explanation.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-background-card rounded-xl shadow-sm border border-border p-8 mb-8">
            <div className="bg-background/50 dark:bg-background/10 p-5 rounded-lg border border-border mb-8">
              <h2 className="font-semibold mb-3 text-text text-lg flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                Feynman Technique Tips
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-text-light">
                <li>Explain the concept as if teaching it to a complete beginner</li>
                <li>Use simple language and avoid jargon</li>
                <li>Identify gaps in your understanding and note them down</li>
                <li>Connect ideas to things you already know</li>
                {noteId && noteTitle ? (
                  <li className="text-primary">Use your <span className="font-medium">{noteTitle}</span> note as a foundation for your explanation</li>
                ) : sourceInfo && (
                  <li className="text-primary">We've pre-filled content from your notes to help you start</li>
                )}
              </ul>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-text flex items-center">
                    <PenLine className="h-5 w-5 mr-2 text-primary" />
                    Your Explanation
                  </h2>
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
                  className="shadow-sm hover:shadow-md transition-shadow"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Grading your explanation...
                    </>
                  ) : (
                    <>Submit Teach-Back Session</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="mt-8 flex justify-end">
                <Button onClick={handleViewResults} className="shadow-sm hover:shadow-md transition-shadow">
                  <CheckCircle className="h-4 w-4 mr-2" />
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