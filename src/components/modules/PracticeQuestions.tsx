import { useState, useEffect, useRef } from 'react'
import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Edit, Trash2, BookOpen, LayoutGrid, List, ChevronUp, ChevronDown, Eye, ArrowLeft, Upload, X, Copy, Sparkles, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { PracticeQuestion } from '@/services/practiceQuestionService'
import { useToast } from '@/components/ui/use-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
    question_image_url: '',
    answer_text: '',
    answer_image_url: '',
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
  
  // Add states for image uploads and analysis
  const [isUploadingQuestionImage, setIsUploadingQuestionImage] = useState(false)
  const [isUploadingAnswerImage, setIsUploadingAnswerImage] = useState(false)
  const [_isAnalyzingQuestionImage, _setIsAnalyzingQuestionImage] = useState(false)
  const [_isAnalyzingAnswerImage, _setIsAnalyzingAnswerImage] = useState(false)
  const questionImageInputRef = useRef<HTMLInputElement>(null)
  const answerImageInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  // New states for AI evaluation
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [userAnswerImage, setUserAnswerImage] = useState<string>('')
  const [isUploadingUserAnswerImage, setIsUploadingUserAnswerImage] = useState(false)
  const userAnswerImageInputRef = useRef<HTMLInputElement>(null)
  const [aiEvaluation, setAiEvaluation] = useState<{
    evaluation: string;
    score: number;
    isCorrect: boolean;
    isPartiallyCorrect: boolean;
    isIncorrect: boolean;
  } | null>(null)
  
  // Add new state variables for variants
  const [isGeneratingVariant, setIsGeneratingVariant] = useState(false)
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false)
  const [selectedQuestionForVariant, setSelectedQuestionForVariant] = useState<PracticeQuestion | null>(null)
  const [numVariantsToGenerate, setNumVariantsToGenerate] = useState(1)
  const [_generatedVariants, setGeneratedVariants] = useState<PracticeQuestion[]>([])
  const [showVariantsFor, setShowVariantsFor] = useState<string | null>(null)
  
  // Add new state variables for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [practiceToDelete, setPracticeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
      question_image_url: '',
      answer_text: '',
      answer_image_url: '',
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
      question_image_url: question.question_image_url || '',
      answer_text: question.answer_text,
      answer_image_url: question.answer_image_url || '',
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
          question_image_url: formData.question_image_url,
          answer_text: formData.answer_text,
          answer_image_url: formData.answer_image_url,
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
          question_image_url: formData.question_image_url,
          answer_text: formData.answer_text,
          answer_image_url: formData.answer_image_url,
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
  const handleDeleteClick = (practiceId: string) => {
    setPracticeToDelete(practiceId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!practiceToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/practice-questions?id=${practiceToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete practice problem');
      }
      
      // Update the local state by removing the deleted question
      setQuestions(prev => prev.filter(q => q.id !== practiceToDelete));
      
      toast({
        title: "Success",
        description: "Practice problem deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting practice problem:', error);
      toast({
        title: "Error",
        description: "Failed to delete practice problem",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setPracticeToDelete(null);
    }
  };
  
  // Handle user answer image upload
  const handleUserAnswerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    
    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, GIF, or WebP image.',
        variant: 'destructive'
      });
      if (e.target.value) e.target.value = '';
      return;
    }
    
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive'
      });
      if (e.target.value) e.target.value = '';
      return;
    }
    
    setIsUploadingUserAnswerImage(true)
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      const response = await fetch('/api/practice-questions/analyze-image', {
        method: 'POST',
        body: formData
      })
      
      let errorData;
      
      if (!response.ok) {
        try {
          errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload image');
        } catch {
          throw new Error(`Upload failed with status ${response.status}`);
        }
      }
      
      const data = await response.json()
      setUserAnswerImage(data.imageUrl)
      
      toast({
        title: 'Image uploaded successfully',
        description: 'Your image has been added to your answer.',
        variant: 'default'
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: 'Error uploading image',
        description: error instanceof Error ? error.message : 'There was a problem uploading your image. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsUploadingUserAnswerImage(false)
      if (e.target.value) e.target.value = ''
    }
  }
  
  // Start practice mode
  const handleStartPractice = () => {
    if (questions.length === 0) {
      toast({
        title: 'No questions available',
        description: 'Create some practice questions first.',
        variant: 'destructive'
      })
      return
    }
    
    // Shuffle questions for practice
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    setPracticeQuestions(shuffled)
    setPracticeIndex(0)
    setShowAnswer(false)
    setUserAnswer('')
    setUserAnswerImage('')
    setAiEvaluation(null)
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
        setUserAnswer('')
        setUserAnswerImage('')
        setAiEvaluation(null)
      } else {
        // End of practice session
        setIsPracticeMode(false)
        setUserAnswer('')
        setUserAnswerImage('')
        setAiEvaluation(null)
        
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
  
  // Handle question image upload
  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    
    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, GIF, or WebP image.',
        variant: 'destructive'
      });
      if (e.target.value) e.target.value = '';
      return;
    }
    
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive'
      });
      if (e.target.value) e.target.value = '';
      return;
    }
    
    setIsUploadingQuestionImage(true)
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      const response = await fetch('/api/practice-questions/analyze-image', {
        method: 'POST',
        body: formData
      })
      
      let errorData;
      
      if (!response.ok) {
        try {
          errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload image');
        } catch {
          throw new Error(`Upload failed with status ${response.status}`);
        }
      }
      
      const data = await response.json()
      setFormData(prev => ({ ...prev, question_image_url: data.imageUrl }))
      
      toast({
        title: 'Image uploaded successfully',
        description: 'Your image has been added to the question.',
        variant: 'default'
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: 'Error uploading image',
        description: error instanceof Error ? error.message : 'There was a problem uploading your image. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsUploadingQuestionImage(false)
      if (e.target.value) e.target.value = ''
    }
  }
  
  // Handle answer image upload
  const handleAnswerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    
    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, GIF, or WebP image.',
        variant: 'destructive'
      });
      if (e.target.value) e.target.value = '';
      return;
    }
    
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive'
      });
      if (e.target.value) e.target.value = '';
      return;
    }
    
    setIsUploadingAnswerImage(true)
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      const response = await fetch('/api/practice-questions/analyze-image', {
        method: 'POST',
        body: formData
      })
      
      let errorData;
      
      if (!response.ok) {
        try {
          errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload image');
        } catch {
          throw new Error(`Upload failed with status ${response.status}`);
        }
      }
      
      const data = await response.json()
      setFormData(prev => ({ ...prev, answer_image_url: data.imageUrl }))
      
      toast({
        title: 'Image uploaded successfully',
        description: 'Your image has been added to the answer.',
        variant: 'default'
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: 'Error uploading image',
        description: error instanceof Error ? error.message : 'There was a problem uploading your image. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsUploadingAnswerImage(false)
      if (e.target.value) e.target.value = ''
    }
  }

  // Internal utility function to analyze question image with AI (not exposed in UI)
  const _analyzeQuestionImage = async (imageUrl: string) => {
    if (!imageUrl) {
      return null;
    }

    try {
      const imageFormData = new FormData()
      
      // Fetch the image and convert to a file
      const imageResponse = await fetch(imageUrl)
      const imageBlob = await imageResponse.blob()
      const file = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' })
      
      imageFormData.append('image', file)
      imageFormData.append('prompt', 'Analyze this image and extract any text or important information. Describe what you see in detail.')
      
      const response = await fetch('/api/practice-questions/analyze-image', {
        method: 'POST',
        body: imageFormData
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze image')
      }
      
      const data = await response.json()
      return data.analysis;
    } catch (error) {
      console.error('Error analyzing image:', error)
      return null;
    }
  }

  // Internal utility function to analyze answer image with AI (not exposed in UI)
  const _analyzeAnswerImage = async (imageUrl: string) => {
    if (!imageUrl) {
      return null;
    }

    try {
      const imageFormData = new FormData()
      
      // Fetch the image and convert to a file
      const imageResponse = await fetch(imageUrl)
      const imageBlob = await imageResponse.blob()
      const file = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' })
      
      imageFormData.append('image', file)
      imageFormData.append('prompt', 'Analyze this image and extract any text or important information. Describe what you see in detail.')
      
      const response = await fetch('/api/practice-questions/analyze-image', {
        method: 'POST',
        body: imageFormData
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze image')
      }
      
      const data = await response.json()
      return data.analysis;
    } catch (error) {
      console.error('Error analyzing image:', error)
      return null;
    }
  }
  
  // Evaluate answer with AI
  const evaluateAnswerWithAI = async () => {
    if (!practiceQuestions[practiceIndex]) return
    
    setIsEvaluatingAnswer(true)
    try {
      const currentQuestion = practiceQuestions[practiceIndex]
      
      const response = await fetch('/api/practice-questions/evaluate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionText: currentQuestion.question_text,
          questionImageUrl: currentQuestion.question_image_url,
          userAnswer: userAnswer,
          userAnswerImageUrl: userAnswerImage,
          correctAnswer: currentQuestion.answer_text,
          correctAnswerImageUrl: currentQuestion.answer_image_url
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to evaluate answer')
      }
      
      const data = await response.json()
      setAiEvaluation(data)
      
      // Don't automatically record the practice result - let the user decide
      // based on the AI evaluation
    } catch (error) {
      console.error('Error evaluating answer:', error)
      toast({
        title: 'Error evaluating answer',
        description: 'There was a problem evaluating your answer. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsEvaluatingAnswer(false)
    }
  }
  
  // Generate variants of a practice question
  const handleGenerateVariants = async () => {
    if (!selectedQuestionForVariant) return
    
    setIsGeneratingVariant(true)
    try {
      const response = await fetch('/api/practice-questions/generate-variant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: selectedQuestionForVariant.id,
          studySessionId: moduleId,
          numVariants: numVariantsToGenerate
        })
      })
      
      // Get the response text first to help with debugging
      const responseText = await response.text();
      
      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate question variants');
      }
      
      setGeneratedVariants(data.variants || [])
      
      // Add the new variants to the questions list
      setQuestions(prev => [...data.variants, ...prev])
      
      toast({
        title: 'Variants generated',
        description: `Successfully generated ${data.variants.length} variant(s) of the question.`,
        variant: 'default'
      })
      
      // Close the dialog
      setIsVariantDialogOpen(false)
    } catch (error) {
      console.error('Error generating variants:', error)
      toast({
        title: 'Error generating variants',
        description: error instanceof Error ? error.message : 'There was a problem generating variants. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingVariant(false)
    }
  }
  
  // Open the variant generation dialog
  const openVariantDialog = (question: PracticeQuestion) => {
    setSelectedQuestionForVariant(question)
    setNumVariantsToGenerate(1)
    setIsVariantDialogOpen(true)
  }
  
  // Toggle showing variants for a question
  const toggleShowVariants = async (questionId: string) => {
    if (showVariantsFor === questionId) {
      setShowVariantsFor(null)
      return
    }
    
    setShowVariantsFor(questionId)
    
    // Fetch variants if not already loaded
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('practice_questions')
        .select('*')
        .eq('parent_question_id', questionId)
      
      if (error) {
        console.error('Error fetching variants:', error)
        return
      }
      
      if (data && data.length > 0) {
        // Add any variants that aren't already in the questions list
        const existingIds = questions.map(q => q.id)
        const newVariants = data.filter(v => !existingIds.includes(v.id))
        
        if (newVariants.length > 0) {
          setQuestions(prev => [...newVariants, ...prev])
        }
      }
    } catch (error) {
      console.error('Error fetching variants:', error)
    }
  }
  
  // Get variants for a question
  const getVariantsForQuestion = (questionId: string) => {
    return questions.filter(q => q.parent_question_id === questionId)
  }
  
  // Check if a question has variants
  const hasVariants = (questionId: string) => {
    return questions.some(q => q.parent_question_id === questionId)
  }
  
  // Check if a question is a variant
  const isVariant = (question: PracticeQuestion) => {
    return !!question.parent_question_id
  }
  
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
                className="font-medium dark:bg-opacity-90 dark:text-white"
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
            {currentQuestion.question_image_url && (
              <div className="mt-4">
                <Image 
                  src={currentQuestion.question_image_url} 
                  alt="Question" 
                  className="max-h-64 rounded-md object-contain mx-auto"
                  width={500}
                  height={300}
                  style={{ maxHeight: '16rem', width: 'auto' }}
                />
              </div>
            )}
          </CardContent>
        </Card>
        
        {!showAnswer ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Answer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type your answer here..."
                  rows={4}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="bg-background text-foreground placeholder:text-muted-foreground"
                />
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={userAnswerImageInputRef}
                      onChange={handleUserAnswerImageUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => userAnswerImageInputRef.current?.click()}
                      disabled={isUploadingUserAnswerImage}
                    >
                      {isUploadingUserAnswerImage ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Add Image to Answer
                    </Button>
                  </div>
                  
                  {userAnswerImage && (
                    <div className="mt-2 relative">
                      <Image 
                        src={userAnswerImage} 
                        alt="Your answer" 
                        className="max-h-40 rounded-md object-contain"
                        width={400}
                        height={240}
                        style={{ maxHeight: '10rem', width: 'auto' }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setUserAnswerImage('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={() => setShowAnswer(true)} 
                  disabled={isEvaluatingAnswer}
                >
                  {isEvaluatingAnswer ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Answer
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Correct Answer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-foreground dark:text-white">{currentQuestion.answer_text}</div>
                {currentQuestion.answer_image_url && (
                  <div className="mt-4">
                    <Image 
                      src={currentQuestion.answer_image_url} 
                      alt="Answer" 
                      className="max-h-64 rounded-md object-contain mx-auto"
                      width={500}
                      height={300}
                      style={{ maxHeight: '16rem', width: 'auto' }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            
            {(userAnswer || userAnswerImage) && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Your Answer</CardTitle>
                </CardHeader>
                <CardContent>
                  {userAnswer && (
                    <div className="whitespace-pre-wrap text-foreground dark:text-white">{userAnswer}</div>
                  )}
                  {userAnswerImage && (
                    <div className="mt-4">
                      <Image 
                        src={userAnswerImage} 
                        alt="Your answer" 
                        className="max-h-40 rounded-md object-contain"
                        width={400}
                        height={240}
                        style={{ maxHeight: '10rem', width: 'auto' }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            <div className="text-center mb-4">How did you do?</div>
            <div className="flex justify-center gap-4 mb-8">
              <Button 
                variant="destructive" 
                onClick={() => evaluateAnswerWithAI()}
                disabled={isEvaluatingAnswer}
              >
                {isEvaluatingAnswer ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  "Evaluate My Answer"
                )}
              </Button>
            </div>
            
            {aiEvaluation && (
              <Card className="mb-6 border-2 border-primary">
                <CardHeader>
                  <CardTitle>AI Evaluation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-foreground dark:text-white">{aiEvaluation.evaluation}</div>
                  <div className="mt-4 flex justify-center">
                    <Badge 
                      variant={
                        aiEvaluation.isCorrect ? 'default' :
                        aiEvaluation.isPartiallyCorrect ? 'outline' : 'destructive'
                      } 
                      className="text-lg px-4 py-2"
                    >
                      Score: {aiEvaluation.score}/5
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="w-full">
                    <div className="text-center mb-4">Do you agree with this evaluation?</div>
                    <div className="flex justify-center gap-4">
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
                  </div>
                </CardFooter>
              </Card>
            )}
            
            {!aiEvaluation && (
              <>
                <div className="text-center mb-4">Or manually rate your answer:</div>
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
            <React.Fragment key={question.id}>
              <Card 
                className={`h-full flex flex-col cursor-pointer hover:shadow-md transition-shadow ${
                  isVariant(question) ? 'border-l-4 border-l-primary' : ''
                }`}
                onClick={() => toggleCardExpansion(question.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          question.difficulty === 'easy' ? 'secondary' :
                          question.difficulty === 'medium' ? 'default' : 'destructive'
                        } 
                        className="font-medium dark:bg-opacity-90 dark:text-white"
                      >
                        {question.difficulty}
                      </Badge>
                      {isVariant(question) && (
                        <Badge variant="outline" className="bg-primary/10">
                          Variant
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation(); // Prevent card expansion
                              openVariantDialog(question);
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Generate Variants
                          </DropdownMenuItem>
                          {hasVariants(question.id) && (
                            <DropdownMenuItem 
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation(); // Prevent card expansion
                                toggleShowVariants(question.id);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {showVariantsFor === question.id ? 'Hide Variants' : 'Show Variants'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                          handleDeleteClick(question.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2 line-clamp-2 dark:!text-white text-foreground">
                    {question.question_text}
                  </CardTitle>
                  {question.question_image_url && (
                    <div className="mt-2">
                      <Image 
                        src={question.question_image_url} 
                        alt="Question" 
                        className="max-h-32 rounded-md object-contain"
                        width={500}
                        height={300}
                        style={{ maxHeight: '16rem', width: 'auto' }}
                      />
                    </div>
                  )}
                  {question.source && (
                    <CardDescription className="text-muted-foreground dark:text-gray-300">Source: {question.source}</CardDescription>
                  )}
                </CardHeader>
                {showVariantsFor === question.id && getVariantsForQuestion(question.id).map(variant => (
                  <Card 
                    key={variant.id}
                    className="h-full flex flex-col cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary ml-6"
                    onClick={() => toggleCardExpansion(variant.id)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              variant.difficulty === 'easy' ? 'secondary' :
                              variant.difficulty === 'medium' ? 'default' : 'destructive'
                            } 
                            className="font-medium dark:bg-opacity-90 dark:text-white"
                          >
                            {variant.difficulty}
                          </Badge>
                          <Badge variant="outline" className="bg-primary/10">
                            Variant
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card expansion when clicking edit
                              handleEditQuestion(variant);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card expansion when clicking delete
                              handleDeleteClick(variant.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-2 line-clamp-2 dark:!text-white text-foreground">
                        {variant.question_text}
                      </CardTitle>
                      {variant.question_image_url && (
                        <div className="mt-2">
                          <Image 
                            src={variant.question_image_url} 
                            alt="Question" 
                            className="max-h-32 rounded-md object-contain"
                            width={500}
                            height={300}
                            style={{ maxHeight: '16rem', width: 'auto' }}
                          />
                        </div>
                      )}
                      {variant.source && (
                        <CardDescription className="text-muted-foreground dark:text-gray-300">Source: {variant.source}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </Card>
            </React.Fragment>
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
                      className="font-medium dark:bg-opacity-90 dark:text-white"
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
                          handleDeleteClick(question.id);
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
        <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
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
            
            <div className="grid gap-2">
              <Label htmlFor="question_image_url">Question Image</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={questionImageInputRef}
                  onChange={handleQuestionImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => questionImageInputRef.current?.click()}
                  disabled={isUploadingQuestionImage}
                >
                  {isUploadingQuestionImage ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Image
                </Button>
              </div>
              
              {formData.question_image_url && (
                <div className="mt-2 relative">
                  <Image 
                    src={formData.question_image_url} 
                    alt="Question" 
                    className="max-h-40 rounded-md object-contain"
                    width={400}
                    height={240}
                    style={{ maxHeight: '10rem', width: 'auto' }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setFormData(prev => ({ ...prev, question_image_url: '' }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="answer_image_url">Answer Image</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={answerImageInputRef}
                  onChange={handleAnswerImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => answerImageInputRef.current?.click()}
                  disabled={isUploadingAnswerImage}
                >
                  {isUploadingAnswerImage ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Image
                </Button>
              </div>
              
              {formData.answer_image_url && (
                <div className="mt-2 relative">
                  <Image 
                    src={formData.answer_image_url} 
                    alt="Answer" 
                    className="max-h-40 rounded-md object-contain"
                    width={400}
                    height={240}
                    style={{ maxHeight: '10rem', width: 'auto' }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setFormData(prev => ({ ...prev, answer_image_url: '' }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
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
        <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
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
            
            <div className="grid gap-2">
              <Label htmlFor="question_image_url">Question Image</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={questionImageInputRef}
                  onChange={handleQuestionImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => questionImageInputRef.current?.click()}
                  disabled={isUploadingQuestionImage}
                >
                  {isUploadingQuestionImage ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Image
                </Button>
              </div>
              
              {formData.question_image_url && (
                <div className="mt-2 relative">
                  <Image 
                    src={formData.question_image_url} 
                    alt="Question" 
                    className="max-h-40 rounded-md object-contain"
                    width={400}
                    height={240}
                    style={{ maxHeight: '10rem', width: 'auto' }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setFormData(prev => ({ ...prev, question_image_url: '' }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="answer_image_url">Answer Image</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={answerImageInputRef}
                  onChange={handleAnswerImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => answerImageInputRef.current?.click()}
                  disabled={isUploadingAnswerImage}
                >
                  {isUploadingAnswerImage ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Image
                </Button>
              </div>
              
              {formData.answer_image_url && (
                <div className="mt-2 relative">
                  <Image 
                    src={formData.answer_image_url} 
                    alt="Answer" 
                    className="max-h-40 rounded-md object-contain"
                    width={400}
                    height={240}
                    style={{ maxHeight: '10rem', width: 'auto' }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setFormData(prev => ({ ...prev, answer_image_url: '' }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
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
      
      {/* Variant Generation Dialog */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Generate Question Variants</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create variations of this question to practice similar concepts.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="original_question" className="text-foreground">Original Question</Label>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-foreground">{selectedQuestionForVariant?.question_text}</p>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="num_variants" className="text-foreground">Number of Variants</Label>
              <Select 
                value={numVariantsToGenerate.toString()} 
                onValueChange={(value) => setNumVariantsToGenerate(parseInt(value))}
              >
                <SelectTrigger className="bg-background text-foreground">
                  <SelectValue placeholder="Select number of variants" className="text-foreground" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-foreground">
                  <SelectItem value="1" className="text-foreground">1 Variant</SelectItem>
                  <SelectItem value="2" className="text-foreground">2 Variants</SelectItem>
                  <SelectItem value="3" className="text-foreground">3 Variants</SelectItem>
                  <SelectItem value="5" className="text-foreground">5 Variants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariantDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateVariants}
              disabled={isGeneratingVariant}
            >
              {isGeneratingVariant ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Variants
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Practice Problem</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this practice problem? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Replace the custom dropdown components with a better implementation
const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === DropdownMenuTrigger) {
          return React.cloneElement(child as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement> & { onClick?: (e: React.MouseEvent) => void }>, {
            onClick: () => setIsOpen(!isOpen),
          });
        }
        if (React.isValidElement(child) && child.type === DropdownMenuContent) {
          return isOpen ? child : null;
        }
        return child;
      })}
    </div>
  );
};

const DropdownMenuTrigger = ({ children, onClick, ...props }: { children: React.ReactNode, onClick?: (e: React.MouseEvent) => void } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={onClick}
      {...props}
    >
      {children}
    </Button>
  );
};

const DropdownMenuContent = ({ align = "end", children }: { align?: "center" | "end" | "start", children: React.ReactNode }) => {
  const alignClass = 
    align === "center" ? "left-1/2 transform -translate-x-1/2" : 
    align === "start" ? "left-0" : "right-0";

  return (
    <div className={`absolute ${alignClass} mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50 animate-in fade-in-50 zoom-in-95 slide-in-from-top-2`}>
      <div className="py-1 rounded-md overflow-hidden">{children}</div>
    </div>
  );
};

const DropdownMenuItem = ({ children, onClick }: { children: React.ReactNode, onClick?: (e: React.MouseEvent) => void }) => {
  return (
    <button
      className="flex w-full items-center text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      onClick={onClick}
    >
      {children}
    </button>
  );
}; 