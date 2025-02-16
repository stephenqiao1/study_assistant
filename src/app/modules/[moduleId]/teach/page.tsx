'use client'

import { useState, useEffect } from 'react'
import TextEditor from '@/components/teach/TextEditor'
import AudioRecorder from '@/components/teach/AudioRecorder'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import ChatInterface from '@/components/chat/ChatInterface'
import { use } from 'react'

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
  // Unwrap the params promise using React.use()
  const { moduleId } = use(params)
  
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
        const { data: module, error } = await supabase
          .from('study_sessions')
          .select('details')
          .eq('module_id', moduleId)
          .eq('session_type', 'text')
          .single()

        if (error) throw error

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
    setIsSubmitting(true)
    const supabase = createClient()
    
    try {
      // Get the current module data
      const { data: module, error: fetchError } = await supabase
        .from('study_sessions')
        .select('details')
        .eq('module_id', moduleId)
        .eq('session_type', 'text')
        .single()

      if (fetchError) throw fetchError

      setModuleContent(module.details.content)

      // Grade the explanation using AI
      const gradingResult = await gradeExplanation(text, module.details.content)
      setGradingResult(gradingResult)

      // Create timestamp once and reuse it
      const timestamp = new Date().toISOString()
      setSubmissionTimestamp(timestamp)

      // Update the module with the teach-back data
      const updatedDetails = {
        ...module.details,
        teach_backs: [
          ...(module.details.teach_backs || []),
          {
            grade: gradingResult.grade,
            timestamp,
            explanation: {
              text: text
            },
            feedback: gradingResult.feedback
          }
        ]
      }

      const { error: updateError } = await supabase
        .from('study_sessions')
        .update({ details: updatedDetails })
        .eq('module_id', moduleId)
        .eq('session_type', 'text')

      if (updateError) throw updateError
      
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
      const { data: module } = await supabase
        .from('study_sessions')
        .select('details')
        .eq('module_id', moduleId)
        .eq('session_type', 'text')
        .single()

      if (!module) return

      const teachBack = {
        grade: gradingResult.grade,
        timestamp: submissionTimestamp,
        explanation: {
          text: text
        },
        feedback: gradingResult.feedback,
        conversation
      }

      const updatedDetails = {
        ...module.details,
        teach_backs: [
          ...(module.details.teach_backs || []),
          teachBack
        ]
      }

      await supabase
        .from('study_sessions')
        .update({ details: updatedDetails })
        .eq('module_id', moduleId)
        .eq('session_type', 'text')

    } catch (error) {
      console.error('Error saving chat:', error)
    }
  }

  if (showChat) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Teaching Back
            </h2>
            <h1 className="text-3xl font-bold">
              {moduleTitle}
            </h1>
          </div>
          <ChatInterface
            initialMessage={text}
            originalContent={moduleContent}
            onSaveConversation={handleSaveChat}
          />
          <div className="mt-8 flex justify-end">
            <Button onClick={handleViewResults}>
              View Results
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Teaching Back
          </h2>
          <h1 className="text-3xl font-bold">
            {moduleTitle}
          </h1>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
          <h2 className="font-semibold mb-2">🎓 Feynman Technique Tips:</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Explain the concept as if teaching it to a complete beginner</li>
            <li>Use simple language and avoid jargon</li>
            <li>Identify gaps in your understanding and note them down</li>
            <li>Connect ideas to things you already know</li>
          </ul>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">✍️ Your Explanation</h2>
            <AudioRecorder onTranscriptionComplete={handleTranscription} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
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
  )
} 