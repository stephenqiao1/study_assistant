'use client'

import { useState, useEffect } from 'react'
import TextEditor from '@/components/teach/TextEditor'
import AudioRecorder from '@/components/teach/AudioRecorder'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import ChatInterface from '@/components/chat/ChatInterface'
import { use } from 'react'
import Link from 'next/link'
import { BookOpen, LogOut } from 'lucide-react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import Footer from '@/components/layout/Footer'

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
  const { moduleId } = use(params)
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [moduleContent, setModuleContent] = useState('')
  const [moduleTitle, setModuleTitle] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null)
  const [submissionTimestamp, setSubmissionTimestamp] = useState<string | null>(null)

  useEffect(() => {
    // Fetch module details when component mounts
    const fetchModuleDetails = async () => {
      const supabase = createClient()
      try {
        console.log('Fetching module details for:', moduleId)
        const { data: module, error } = await supabase
          .from('study_sessions')
          .select('details')
          .eq('module_title', moduleId)
          .single()

        if (error) {
          console.error('Error fetching module details:', error)
          throw error
        }

        console.log('Found module:', module)
        setModuleTitle(module.details.title)
        setModuleContent(module.details.content)
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
    if (!session?.user?.id) {
      console.error('No authenticated user')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()
    
    try {
      // Get the study session ID
      const { data: studySession, error: fetchError } = await supabase
        .from('study_sessions')
        .select('id')
        .eq('module_title', moduleId)
        .single()

      if (fetchError) throw fetchError

      // Grade the explanation using AI
      const gradingResult = await gradeExplanation(text, moduleContent)
      setGradingResult(gradingResult)

      // Create timestamp once and reuse it
      const timestamp = new Date().toISOString()
      setSubmissionTimestamp(timestamp)

      // Create a new teach back entry
      const { data: teachBack, error: createError } = await supabase
        .from('teach_backs')
        .insert({
          study_session_id: studySession.id,
          user_id: session.user.id,
          content: text,
          grade: gradingResult.grade,
          feedback: {
            clarity: gradingResult.feedback.clarity,
            completeness: gradingResult.feedback.completeness,
            correctness: gradingResult.feedback.correctness
          },
          created_at: timestamp
        })
        .select()
        .single()

      if (createError) throw createError
      
      setShowOptions(true)
    } catch (error) {
      console.error('Error saving teach-back:', error)
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
    window.location.href = `/modules/${moduleId}/teach/results?timestamp=${encodeURIComponent(submissionTimestamp)}`
  }

  const handleSaveChat = async (conversation: any) => {
    if (!gradingResult || !submissionTimestamp) return

    const supabase = createClient()
    try {
      // Get the study session ID
      const { data: studySession, error: sessionError } = await supabase
        .from('study_sessions')
        .select('id')
        .eq('module_title', moduleId)
        .single()

      if (sessionError) throw sessionError

      // Get the latest teach back for this session
      const { data: teachBack, error: fetchError } = await supabase
        .from('teach_backs')
        .select('id, feedback')
        .eq('study_session_id', studySession.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError) throw fetchError

      // Update the teach back with the conversation
      const updatedFeedback = {
        ...teachBack.feedback,
        conversation
      }

      const { error: updateError } = await supabase
        .from('teach_backs')
        .update({ feedback: updatedFeedback })
        .eq('id', teachBack.id)

      if (updateError) throw updateError

    } catch (error) {
      console.error('Error saving chat:', error)
    }
  }

  // Add handleSignOut function
  const handleSignOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect in useRequireAuth
  }

  if (showChat) {
    return (
      <div className="min-h-screen bg-secondary">
        {/* Header */}
        <header className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-primary">Academiq</span>
              </Link>
              <nav className="hidden md:flex items-center space-x-8">
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
        <main className="pt-24 pb-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-sm font-medium text-text-light mb-2">Teaching Back</h2>
              <h1 className="text-3xl font-bold text-text">{moduleTitle}</h1>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-8">
              <ChatInterface
                initialMessage={text}
                originalContent={moduleContent}
                onSaveConversation={handleSaveChat}
              />
              <div className="mt-8 flex justify-end">
                <Button onClick={handleViewResults}>View Results</Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-primary">Academiq</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
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
      <main className="pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-sm font-medium text-text-light mb-2">Teaching Back</h2>
            <h1 className="text-3xl font-bold text-text">{moduleTitle}</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-8">
              <h2 className="font-semibold mb-2">🎓 Feynman Technique Tips:</h2>
              <ul className="list-disc list-inside space-y-2 text-sm">
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
                  <AudioRecorder onTranscriptionComplete={handleTranscription} />
                </div>
                <p className="text-sm text-text-light mb-4">
                  Type your explanation or use voice recording - both will appear in the text editor below
                </p>
                <TextEditor
                  value={text}
                  onChange={setText}
                />
              </div>
            </div>

            {!showOptions ? (
              <div className="mt-8 flex justify-end">
                <Button 
                  onClick={handleSubmit} 
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Teach-Back Session'}
                </Button>
              </div>
            ) : (
              <div className="mt-8 flex justify-end gap-4">
                <Button 
                  variant="outline"
                  onClick={handleViewResults}
                >
                  View Results
                </Button>
                <Button
                  onClick={() => setShowChat(true)}
                >
                  Start Virtual Student Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
} 