import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { X, Loader2, CheckCircle } from 'lucide-react'
import TextEditor from '@/components/teach/TextEditor'
import AudioRecorder from '@/components/teach/AudioRecorder'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

type ActiveSection = 'notes' | 'flashcards' | 'teachback' | 'reminders'

interface Note {
  id: string
  title: string
  content: string
}

interface GradeResponse {
  score: number
  feedback: string
  status: 'success' | 'error'
}

interface TeachbackSectionProps {
  selectedNote: Note | null
  teachbackCount: number
  teachbackLimit: number
  isPremiumUser: boolean
  setActiveSection: (section: ActiveSection) => void
  teachbackText: string
  setTeachbackText: (text: string) => void
  isGrading: boolean
  gradeTeachback: () => void
  renderLatex: (content: string) => string
}

export function TeachbackSection({
  selectedNote,
  teachbackCount,
  teachbackLimit,
  isPremiumUser,
  setActiveSection,
  teachbackText,
  setTeachbackText,
  isGrading,
  gradeTeachback: parentGradeTeachback,
  renderLatex
}: TeachbackSectionProps) {
  const [feedback, setFeedback] = useState<string>('')
  const [score, setScore] = useState<number | null>(null)
  const { toast } = useToast()

  const handleGradeTeachback = async () => {
    if (!selectedNote || !teachbackText.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide an explanation before submitting"
      })
      return
    }

    if (teachbackCount >= teachbackLimit && !isPremiumUser) {
      toast({
        variant: "destructive",
        title: "Limit Reached",
        description: "You have reached your teachback limit. Please upgrade to continue."
      })
      return
    }

    try {
      const payload = {
        noteId: selectedNote.id,
        noteContent: selectedNote.content,
        teachbackText: teachbackText.trim(),
      }

      const response = await fetch('/api/teachback/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Server response:', errorData)
        throw new Error(errorData.error || 'Failed to grade teachback')
      }

      const data: GradeResponse = await response.json()

      if (data.status === 'success') {
        setScore(data.score)
        setFeedback(data.feedback)
        toast({
          title: "Success",
          description: "Your explanation has been graded!"
        })
        
        // Call parent grading function for any additional logic
        parentGradeTeachback()
      } else {
        throw new Error(data.feedback || 'Failed to grade teachback')
      }
    } catch (error) {
      console.error('Error grading teachback:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to grade your explanation. Please try again."
      })
    }
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Teach Back</h1>
          <div className="flex flex-col">
            <Badge 
              variant={teachbackCount >= teachbackLimit ? "destructive" : 
                     teachbackCount >= teachbackLimit * 0.8 ? "outline" : "secondary"}
              className="text-sm dark:bg-slate-700 dark:text-white"
            >
              {teachbackCount} / {teachbackLimit} submissions
            </Badge>
            {!isPremiumUser && teachbackCount >= teachbackLimit * 0.7 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Upgrade for more submissions
              </span>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setActiveSection('notes')}
        >
          <X className="h-4 w-4 mr-1" /> Close
        </Button>
      </div>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Explain this concept in your own words</h2>
          {selectedNote && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>{selectedNote.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div dangerouslySetInnerHTML={{ __html: renderLatex(selectedNote.content || '') }} />
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="flex flex-col h-full">
          {/* Fixed header with controls */}
          <div className="sticky top-0 bg-background border-b z-10 p-4">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              <AudioRecorder
                onTranscriptionComplete={(text) => setTeachbackText(text)}
              />
              <Button 
                onClick={handleGradeTeachback}
                disabled={isGrading || !teachbackText.trim() || !selectedNote}
                className="ml-4"
              >
                {isGrading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Grading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit for Grading
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-auto p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              <TextEditor
                value={teachbackText}
                onChange={setTeachbackText}
              />
              
              {feedback && (
                <Card className="mt-4 bg-muted">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Feedback
                      {score !== null && (
                        <Badge variant={score >= 0.8 ? "secondary" : score >= 0.6 ? "outline" : "destructive"}>
                          Score: {Math.round(score * 100)}%
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: renderLatex(feedback) }} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            {/* Safe area padding */}
            <div className="h-20" />
          </div>
        </div>
      </div>
    </div>
  )
} 