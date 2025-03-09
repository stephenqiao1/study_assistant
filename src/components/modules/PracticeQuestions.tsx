import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Edit, Trash2, BookOpen, LayoutGrid, List, ChevronUp, ChevronDown, Eye, ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { PracticeQuestion } from '@/services/practiceQuestionService'

interface PracticeQuestionsProps {
  moduleId: string;
  userId: string;
  isPremiumUser: boolean;
  selectedNoteId?: string;
  onNavigateToSection?: (tool: 'teachback' | 'flashcards' | 'module' | 'formulas' | 'videos' | 'practice' | 'notes', noteId?: string) => void;
}

// Add a StudySession interface to replace 'any'
interface StudySession {
  id: string;
  created_at: string;
  user_id: string;
  module_title: string;
  details?: Record<string, unknown>;
}

export default function PracticeQuestions({ moduleId, userId: _userId, isPremiumUser: _isPremiumUser, selectedNoteId, onNavigateToSection }: PracticeQuestionsProps) {
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [_studySession, setStudySession] = useState<StudySession | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  
  // Form states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestion | null>(null)
  const [formData, setFormData] = useState({
    question_text: '',
    answer_text: '',
    source: '',
    difficulty: 'medium',
    notes: '',
    tags: ''
  })
  
  // Practice mode states
  const [isPracticeMode, setIsPracticeMode] = useState(false)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([])
  
  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  
  // Load study session and questions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        
        // Get study session
        const { data: sessionData, error: sessionError } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('id', moduleId)
          .single()
          
        if (sessionError) {
          console.error('Error fetching study session:', sessionError)
          return
        }
        
        setStudySession(sessionData)
        
        // Get practice questions
        const response = await fetch(`/api/practice-questions?studySessionId=${moduleId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch practice questions')
        }
        
        const data = await response.json()
        setQuestions(data)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (moduleId) {
      fetchData()
    }
  }, [moduleId])
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  // Handle difficulty selection
  const handleDifficultyChange = (value: string) => {
    setFormData(prev => ({ ...prev, difficulty: value }))
  }
  
  // Reset form data
  const resetForm = () => {
    setFormData({
      question_text: '',
      answer_text: '',
      source: '',
      difficulty: 'medium',
      notes: '',
      tags: ''
    })
  }
  
  // Open edit dialog with question data
  const handleEditQuestion = (question: PracticeQuestion) => {
    setCurrentQuestion(question)
    setFormData({
      question_text: question.question_text,
      answer_text: question.answer_text,
      source: question.source || '',
      difficulty: question.difficulty || 'medium',
      notes: question.notes || '',
      tags: question.tags ? question.tags.join(', ') : ''
    })
    setIsEditDialogOpen(true)
  }
  
  // Create a new practice question
  const handleCreateQuestion = async () => {
    try {
      const response = await fetch('/api/practice-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          study_session_id: moduleId,
          question_text: formData.question_text,
          answer_text: formData.answer_text,
          source: formData.source,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
          difficulty: formData.difficulty,
          notes: formData.notes
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create practice question')
      }
      
      const newQuestion = await response.json()
      setQuestions(prev => [newQuestion, ...prev])
      setIsAddDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error creating practice question:', error)
    }
  }
  
  // Update an existing practice question
  const handleUpdateQuestion = async () => {
    if (!currentQuestion) return
    
    try {
      const response = await fetch('/api/practice-questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: currentQuestion.id,
          question_text: formData.question_text,
          answer_text: formData.answer_text,
          source: formData.source,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
          difficulty: formData.difficulty,
          notes: formData.notes
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update practice question')
      }
      
      const updatedQuestion = await response.json()
      setQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q))
      setIsEditDialogOpen(false)
      setCurrentQuestion(null)
      resetForm()
    } catch (error) {
      console.error('Error updating practice question:', error)
    }
  }
  
  // Delete a practice question
  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return
    
    try {
      const response = await fetch(`/api/practice-questions?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete practice question')
      }
      
      setQuestions(prev => prev.filter(q => q.id !== id))
    } catch (error) {
      console.error('Error deleting practice question:', error)
    }
  }
  
  // Start practice mode
  const handleStartPractice = () => {
    let filteredQuestions = [...questions]
    
    // Filter by difficulty if needed
    if (activeTab !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === activeTab)
    }
    
    // Shuffle questions
    for (let i = filteredQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filteredQuestions[i], filteredQuestions[j]] = [filteredQuestions[j], filteredQuestions[i]]
    }
    
    setPracticeQuestions(filteredQuestions)
    setPracticeIndex(0)
    setShowAnswer(false)
    setIsPracticeMode(true)
  }
  
  // Record practice result
  const handlePracticeResult = async (correct: boolean, confidenceLevel: number) => {
    if (!practiceQuestions[practiceIndex]) return
    
    try {
      const questionId = practiceQuestions[practiceIndex].id
      
      // Update the question with practice results
      const response = await fetch('/api/practice-questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: questionId,
          last_practiced_at: new Date().toISOString(),
          times_practiced: (practiceQuestions[practiceIndex].times_practiced || 0) + 1,
          confidence_level: confidenceLevel
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update practice results')
      }
      
      // Move to next question or end practice
      if (practiceIndex < practiceQuestions.length - 1) {
        setPracticeIndex(prev => prev + 1)
        setShowAnswer(false)
      } else {
        // End of practice session
        setIsPracticeMode(false)
        
        // Refresh questions to get updated data
        const refreshResponse = await fetch(`/api/practice-questions?studySessionId=${moduleId}`)
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json()
          setQuestions(refreshedData)
        }
      }
    } catch (error) {
      console.error('Error recording practice result:', error)
    }
  }
  
  // Toggle question expansion in list view
  const toggleQuestionExpansion = (questionId: string) => {
    if (expandedQuestionId === questionId) {
      setExpandedQuestionId(null);
    } else {
      setExpandedQuestionId(questionId);
    }
  };
  
  // Toggle card expansion in grid view
  const toggleCardExpansion = (questionId: string) => {
    if (expandedCardId === questionId) {
      setExpandedCardId(null);
    } else {
      setExpandedCardId(questionId);
    }
  };
  
  // Filter questions by difficulty
  const filteredQuestions = activeTab === 'all' 
    ? questions 
    : questions.filter(q => q.difficulty === activeTab)
  
  // Update the navigation function to go back to the selected note
  const handleNavigateToNotes = () => {
    if (onNavigateToSection) {
      // Pass 'notes' instead of 'module' and include the selectedNoteId
      onNavigateToSection('notes', selectedNoteId);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  // Practice mode view
  if (isPracticeMode && practiceQuestions.length > 0) {
    const currentQuestion = practiceQuestions[practiceIndex]
    const progress = ((practiceIndex + 1) / practiceQuestions.length) * 100
    
    return (
      <div className="space-y-6 p-4">
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleNavigateToNotes}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Note
            </Button>
            <h2 className="text-2xl font-bold">Practice Mode</h2>
          </div>
          <Button variant="outline" onClick={() => setIsPracticeMode(false)}>Exit Practice</Button>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
          <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="text-sm text-muted-foreground dark:text-gray-300 mb-8">
          Question {practiceIndex + 1} of {practiceQuestions.length}
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <Badge 
                variant={
                  currentQuestion.difficulty === 'easy' ? 'secondary' :
                  currentQuestion.difficulty === 'medium' ? 'default' : 'destructive'
                } 
                className="dark:text-gray-900 font-medium"
              >
                {currentQuestion.difficulty}
              </Badge>
              {currentQuestion.source && (
                <div className="text-sm text-muted-foreground dark:text-gray-300">Source: {currentQuestion.source}</div>
              )}
            </div>
            <CardTitle className="text-xl mt-2 dark:!text-white text-foreground">Question</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-foreground dark:text-white">{currentQuestion.question_text}</div>
          </CardContent>
        </Card>
        
        {!showAnswer ? (
          <div className="flex justify-center mb-8">
            <Button onClick={() => setShowAnswer(true)}>Show Answer</Button>
          </div>
        ) : (
          <>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl dark:!text-white text-foreground">Answer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-foreground dark:text-white">{currentQuestion.answer_text}</div>
              </CardContent>
            </Card>
            
            <div className="text-center mb-4">How did you do?</div>
            <div className="flex justify-center gap-4 mb-8">
              <Button variant="destructive" onClick={() => handlePracticeResult(false, 1)}>
                Got it wrong
              </Button>
              <Button variant="outline" onClick={() => handlePracticeResult(true, 3)}>
                Got it partially
              </Button>
              <Button variant="default" onClick={() => handlePracticeResult(true, 5)}>
                Got it right
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }
  
  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Practice Questions</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleNavigateToNotes}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Note
          </Button>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="easy">Easy</TabsTrigger>
            <TabsTrigger value="medium">Medium</TabsTrigger>
            <TabsTrigger value="hard">Hard</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-2 items-center">
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={handleStartPractice}
            disabled={questions.length === 0}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" /> Start Practice
          </Button>
        </div>
      </div>
      
      {filteredQuestions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-gray-500 mb-4">No practice questions found</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>Add Your First Question</Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredQuestions.map(question => (
            <Card 
              key={question.id} 
              className="h-full flex flex-col cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => toggleCardExpansion(question.id)}
            >
              <CardHeader>
                <div className="flex justify-between items-center">
                  <Badge 
                    variant={
                      question.difficulty === 'easy' ? 'secondary' :
                      question.difficulty === 'medium' ? 'default' : 'destructive'
                    } 
                    className="dark:text-gray-900 font-medium"
                  >
                    {question.difficulty}
                  </Badge>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card expansion when clicking edit
                        handleEditQuestion(question);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card expansion when clicking delete
                        handleDeleteQuestion(question.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg mt-2 line-clamp-2 dark:!text-white text-foreground">
                  {question.question_text}
                </CardTitle>
                {question.source && (
                  <CardDescription className="text-muted-foreground dark:text-gray-300">Source: {question.source}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                {expandedCardId === question.id ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground dark:text-gray-300 mb-2">Answer:</p>
                    <div className="whitespace-pre-wrap text-foreground dark:text-white">
                      {question.answer_text}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-muted-foreground dark:text-gray-300 p-4 border border-dashed rounded-md dark:border-gray-700">
                    <span className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Click to reveal answer
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between text-sm text-muted-foreground dark:text-gray-300 border-t pt-4">
                <div>
                  {question.times_practiced > 0 ? (
                    <span className="text-muted-foreground dark:text-gray-300">Practiced {question.times_practiced} time{question.times_practiced !== 1 ? 's' : ''}</span>
                  ) : (
                    <span className="text-muted-foreground dark:text-gray-300">Not practiced yet</span>
                  )}
                </div>
                {question.tags && question.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {question.tags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className="dark:border-gray-600 dark:text-white dark:bg-gray-800"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map(question => (
            <Card key={question.id}>
              <div className="p-4 cursor-pointer" onClick={() => toggleQuestionExpansion(question.id)}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={
                        question.difficulty === 'easy' ? 'secondary' :
                        question.difficulty === 'medium' ? 'default' : 'destructive'
                      } 
                      className="dark:text-gray-900 font-medium"
                    >
                      {question.difficulty}
                    </Badge>
                    <h3 className="font-medium text-foreground dark:text-white">{question.question_text.length > 100 
                      ? question.question_text.substring(0, 100) + '...' 
                      : question.question_text}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedQuestionId === question.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </div>
              
              {expandedQuestionId === question.id && (
                <div className="px-4 pb-4 pt-2 border-t">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground dark:text-gray-300 mb-1">Question:</h4>
                    <p className="whitespace-pre-wrap text-foreground dark:text-white">{question.question_text}</p>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground dark:text-gray-300 mb-1">Answer:</h4>
                    <p className="whitespace-pre-wrap text-foreground dark:text-white">{question.answer_text}</p>
                  </div>
                  
                  {question.source && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground dark:text-gray-300 mb-1">Source:</h4>
                      <p className="text-foreground dark:text-white">{question.source}</p>
                    </div>
                  )}
                  
                  {question.notes && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground dark:text-gray-300 mb-1">Notes:</h4>
                      <p className="whitespace-pre-wrap text-foreground dark:text-white">{question.notes}</p>
                    </div>
                  )}
                  
                  {question.tags && question.tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground dark:text-gray-300 mb-1">Tags:</h4>
                      <div className="flex flex-wrap gap-1">
                        {question.tags.map(tag => (
                          <Badge 
                            key={tag} 
                            variant="outline" 
                            className="dark:border-gray-600 dark:text-white dark:bg-gray-800"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground dark:text-gray-300">
                      {question.times_practiced > 0 ? (
                        <>Practiced {question.times_practiced} time{question.times_practiced !== 1 ? 's' : ''}</>
                      ) : (
                        <>Not practiced yet</>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditQuestion(question);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(question.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      
      {/* Add Question Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Practice Question</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new question and answer for your practice session.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="question_text" className="text-foreground">Question</Label>
              <Textarea
                id="question_text"
                name="question_text"
                placeholder="Enter your question here..."
                rows={4}
                value={formData.question_text}
                onChange={handleInputChange}
                className="bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="answer_text" className="text-foreground">Answer</Label>
              <Textarea
                id="answer_text"
                name="answer_text"
                placeholder="Enter the answer here..."
                rows={4}
                value={formData.answer_text}
                onChange={handleInputChange}
                className="bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="source" className="text-foreground">Source (Optional)</Label>
                <Input
                  id="source"
                  name="source"
                  placeholder="e.g., Textbook p.42, Lecture 3"
                  value={formData.source}
                  onChange={handleInputChange}
                  className="bg-background text-foreground placeholder:text-muted-foreground"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="difficulty" className="text-foreground">Difficulty</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={handleDifficultyChange}
                >
                  <SelectTrigger className="bg-background text-foreground">
                    <SelectValue placeholder="Select difficulty" className="text-foreground" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-foreground">
                    <SelectItem value="easy" className="text-foreground">Easy</SelectItem>
                    <SelectItem value="medium" className="text-foreground">Medium</SelectItem>
                    <SelectItem value="hard" className="text-foreground">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="tags" className="text-foreground">Tags (Optional, comma-separated)</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="e.g., math, algebra, equations"
                value={formData.tags}
                onChange={handleInputChange}
                className="bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-foreground">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes or hints..."
                rows={2}
                value={formData.notes}
                onChange={handleInputChange}
                className="bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateQuestion}
              disabled={!formData.question_text || !formData.answer_text}
            >
              Create Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Question Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Practice Question</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update your question and answer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_question_text" className="text-foreground">Question</Label>
              <Textarea
                id="edit_question_text"
                name="question_text"
                placeholder="Enter your question here..."
                rows={4}
                value={formData.question_text}
                onChange={handleInputChange}
                className="bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit_answer_text" className="text-foreground">Answer</Label>
              <Textarea
                id="edit_answer_text"
                name="answer_text"
                placeholder="Enter the answer here..."
                rows={4}
                value={formData.answer_text}
                onChange={handleInputChange}
                className="bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_source" className="text-foreground">Source (Optional)</Label>
                <Input
                  id="edit_source"
                  name="source"
                  placeholder="e.g., Textbook p.42, Lecture 3"
                  value={formData.source}
                  onChange={handleInputChange}
                  className="bg-background text-foreground placeholder:text-muted-foreground"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit_difficulty" className="text-foreground">Difficulty</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={handleDifficultyChange}
                >
                  <SelectTrigger className="bg-background text-foreground">
                    <SelectValue placeholder="Select difficulty" className="text-foreground" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-foreground">
                    <SelectItem value="easy" className="text-foreground">Easy</SelectItem>
                    <SelectItem value="medium" className="text-foreground">Medium</SelectItem>
                    <SelectItem value="hard" className="text-foreground">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit_tags" className="text-foreground">Tags (Optional, comma-separated)</Label>
              <Input
                id="edit_tags"
                name="tags"
                placeholder="e.g., math, algebra, equations"
                value={formData.tags}
                onChange={handleInputChange}
                className="bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit_notes" className="text-foreground">Notes (Optional)</Label>
              <Textarea
                id="edit_notes"
                name="notes"
                placeholder="Any additional notes or hints..."
                rows={2}
                value={formData.notes}
                onChange={handleInputChange}
                className="bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false)
              setCurrentQuestion(null)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateQuestion}
              disabled={!formData.question_text || !formData.answer_text}
            >
              Update Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 