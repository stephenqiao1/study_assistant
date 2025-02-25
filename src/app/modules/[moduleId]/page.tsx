'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { notFound, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { use } from 'react'
import { Trash2, Edit2, Save, X, Plus, ScrollText, Brain, FileText, ArrowRight, Info } from 'lucide-react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import DraftEditor from '@/components/teach/DraftEditor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import StudySessionsSidebar from '@/components/modules/StudySessionsSidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import { useStudyDuration } from '@/hooks/useStudyDuration'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface PageProps {
  params: Promise<{ moduleId: string }>
}

interface Module {
  id: string
  module_title: string
  started_at: string
  details: {
    title: string
    content: string
    description?: string
    available_tools?: string[]
  }
}

interface NoteType {
  id: string
  title: string
  content: string
  tags: string[]
  created_at: string
  updated_at: string
}

export default function ModulePage({ params }: PageProps) {
  const router = useRouter()
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const { moduleId } = use(params)
  const { toast } = useToast()
  
  const [module, setModule] = useState<Module | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [sessions, setSessions] = useState<Module[]>([])
  const [notes, setNotes] = useState<NoteType[]>([])
  const [_currentTab, _setCurrentTab] = useState('notes')
  const [recentNotes, setRecentNotes] = useState<NoteType[]>([])
  const [selectedNote, setSelectedNote] = useState<NoteType | null>(null)
  const [editedNoteContent, setEditedNoteContent] = useState('')

  // Track study duration
  useStudyDuration(module?.id || '', 'module')

  useEffect(() => {
    const fetchModule = async () => {
      if (!session?.user?.id) {
        return
      }

      const supabase = createClient()
      
      // First, let's see all study sessions for this user
      const { data: allUserSessions } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', session.user.id)

      // Now get sessions for this specific module
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('module_title', moduleId)
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })

      if (error) {
        console.error('Error fetching study sessions:', error)
        notFound()
      } else if (!data || data.length === 0) {
        notFound()
      } else {
        // Set the current module to the most recent session
        const currentModule = data[0]
        setModule(currentModule)
        setEditedContent(currentModule.details.content)
        setEditedDescription(currentModule.details.description || '')
        setSessions(allUserSessions || [])
        
        // Fetch notes for this module
        try {
          const { data: noteData, error: noteError } = await supabase
            .from('notes')
            .select('*')
            .eq('study_session_id', currentModule.id)
            .order('updated_at', { ascending: false })
            
          if (noteError) {
            if (noteError.code === '42P01') { // undefined_table
              console.warn('Notes table does not exist yet. This is expected on first run.')
            } else {
              throw noteError
            }
          } else if (noteData) {
            setNotes(noteData)
            setRecentNotes(noteData.slice(0, 3))
            // Select the first note by default if available
            if (noteData.length > 0) {
              setSelectedNote(noteData[0])
              setEditedNoteContent(noteData[0].content)
            }
          }
        } catch (noteError) {
          console.error('Error fetching notes:', noteError)
        }
        
        setIsLoading(false)
      }
    }

    fetchModule()
  }, [moduleId, session])

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()

    try {
      // Get all teach backs related to this module
      const { data: teachBacks, error: teachBacksError } = await supabase
        .from('teach_backs')
        .select('id')
        .eq('study_session_id', module?.id || '')
      
      if (teachBacksError) throw teachBacksError
      
      // Delete all teach backs related to this module
      if (teachBacks && teachBacks.length > 0) {
        const { error: deleteError } = await supabase
          .from('teach_backs')
          .delete()
          .eq('study_session_id', module?.id || '')
          
        if (deleteError) throw deleteError
      }

      // Delete the module
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', module?.id || '')

      if (error) throw error

      router.push('/modules')
    } catch (error) {
      console.error('Error deleting module:', error)
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const _handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    try {
      // Update the module
      const { error } = await supabase
        .from('study_sessions')
        .update({
          details: {
            ...module?.details,
            content: editedContent,
          }
        })
        .eq('id', module?.id || '')

      if (error) throw error

      // Update local state
      setModule(prev => prev ? ({
        ...prev,
        details: {
          ...prev.details,
          content: editedContent
        }
      }) : null)
      
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving module:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleSaveDescription = async () => {
    setIsSaving(true)
    const supabase = createClient()
    
    try {
      // Update the module description
      const { error } = await supabase
        .from('study_sessions')
        .update({
          details: {
            ...module?.details,
            description: editedDescription,
          }
        })
        .eq('id', module?.id || '')
        
      if (error) throw error
      
      // Update local state
      setModule(prev => prev ? ({
        ...prev,
        details: {
          ...prev.details,
          description: editedDescription
        }
      }) : null)
      
      setIsEditingDescription(false)
      
      toast({
        title: "Description updated",
        description: "Your module description has been saved.",
      })
    } catch (error) {
      console.error('Error saving description:', error)
      toast({
        title: "Error saving description",
        description: "There was a problem saving your description.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleGenerateDescription = async () => {
    if (!notes.length) {
      toast({
        title: "No notes available",
        description: "You need at least one note to generate a description.",
        variant: "destructive"
      })
      return
    }
    
    setIsSaving(true)
    
    try {
      // Combine note content for AI prompt
      const noteContents = notes.map(note => note.content).join(' ');
      
      // Call OpenAI to generate description
      const response = await fetch('/api/openai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteContents,
          prompt: "Create a concise module description (max 150 words) summarizing the key concepts from these notes."
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate description');
      
      const data = await response.json();
      if (!data.result) throw new Error('No description generated');
      
      // Set the generated description
      setEditedDescription(data.result);
      setIsEditingDescription(true);
      
      toast({
        title: "Description generated",
        description: "Review and save the generated description.",
      })
    } catch (error) {
      console.error('Error generating description:', error);
      toast({
        title: "Failed to generate description",
        description: "An error occurred while generating the description.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false);
    }
  }
  
  const navigateToStudyTool = (tool: string) => {
    if (!selectedNote && tool !== 'notes') {
      toast({
        title: "No note selected",
        description: `Please select a note first to use the ${tool === 'teach' ? 'Teach Back' : 'Flashcards'} feature.`,
        variant: "destructive"
      });
      return;
    }
    
    if (tool === 'teach') {
      router.push(`/modules/${moduleId}/teach${selectedNote ? `?noteId=${selectedNote.id}` : ''}`);
    } else if (tool === 'flashcards') {
      // For flashcards, only include the noteId parameter, not showForm
      router.push(`/modules/${moduleId}/flashcards${selectedNote ? `?noteId=${selectedNote.id}` : ''}`);
    } else {
      // For other tools
      router.push(`/modules/${moduleId}/${tool}${selectedNote && tool !== 'notes' ? `?noteId=${selectedNote.id}` : ''}`);
    }
  }

  // Add function to handle saving note content
  const handleSaveNote = async () => {
    if (!selectedNote) return
    
    setIsSaving(true)
    const supabase = createClient()
    
    try {
      // Update the note content
      const { error } = await supabase
        .from('notes')
        .update({
          content: editedNoteContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedNote.id)
        
      if (error) throw error
      
      // Update local state
      const updatedNotes = notes.map(note => 
        note.id === selectedNote.id 
          ? { ...note, content: editedNoteContent, updated_at: new Date().toISOString() } 
          : note
      )
      
      setNotes(updatedNotes)
      setRecentNotes(updatedNotes.slice(0, 3))
      setSelectedNote(prev => prev ? { ...prev, content: editedNoteContent, updated_at: new Date().toISOString() } : null)
      setIsEditing(false)
      
      toast({
        title: "Note updated",
        description: "Your note has been saved.",
      })
    } catch (error) {
      console.error('Error saving note:', error)
      toast({
        title: "Error saving note",
        description: "There was a problem saving your note.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleSelectNote = (note: NoteType) => {
    setSelectedNote(note)
    setEditedNoteContent(note.content)
    setIsEditing(false)
  }

  if (isLoadingAuth || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect in useRequireAuth
  }

  if (!module) {
    return <div className="flex justify-center items-center min-h-screen">Module not found</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex min-h-screen pt-16">
        {/* Study Sessions Sidebar */}
        <StudySessionsSidebar 
          sessions={sessions} 
        />

        {/* Main Content */}
        <main className="flex-1 pb-8 p-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2 text-text">{module.details.title}</h1>
                {module.details.description && !isEditingDescription ? (
                  <div className="mb-4">
                    <p className="text-text-light leading-relaxed">{module.details.description}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingDescription(true)}>
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit Description
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit the module description</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : !isEditingDescription ? (
                  <div className="flex gap-2 mb-4">
                    <Button variant="outline" size="sm" onClick={() => setIsEditingDescription(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Description
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateDescription}
                      disabled={isSaving || notes.length === 0}
                    >
                      <Info className="h-3 w-3 mr-1" />
                      Generate from Notes
                    </Button>
                  </div>
                ) : (
                  <div className="mb-4">
                    <Input
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="mb-2"
                      placeholder="Enter a brief description of this module"
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handleSaveDescription}
                        disabled={isSaving}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        {isSaving ? 'Saving...' : 'Save Description'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setIsEditingDescription(false);
                          setEditedDescription(module.details.description || '');
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="outline"
                  className="gap-2 border-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                  Delete
                </Button>
              </div>
            </div>

            {/* The Study Flow Section */}
            <div className="flex items-center justify-center mb-8 bg-background-card rounded-xl shadow-sm border border-border p-4">
              <div className="flex flex-wrap items-center justify-center gap-3 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium mt-1">Notes</span>
                </div>
                <ArrowRight className="h-5 w-5 text-text-light" />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-500/10 text-green-500">
                    <ScrollText className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium mt-1">Flashcards</span>
                </div>
                <ArrowRight className="h-5 w-5 text-text-light" />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                    <Brain className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium mt-1">Teach Back</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Notes Panel - Takes up 3/4 of the space */}
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-background-card rounded-xl shadow-sm border border-border overflow-hidden">
                  <div className="border-b border-border p-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-primary" />
                      <h2 className="text-xl font-semibold">Notes</h2>
                      <Badge className="ml-3" variant="outline">{notes.length} notes</Badge>
                    </div>
                    <Button
                      onClick={() => navigateToStudyTool('notes')} 
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {notes.length > 0 ? 'Manage Notes' : 'Create Notes'}
                    </Button>
                  </div>
                  
                  <div className="p-6">
                    {notes.length > 0 ? (
                      <div className="space-y-4">
                        {recentNotes.map(note => (
                          <Card 
                            key={note.id} 
                            className={`bg-background/50 cursor-pointer transition-colors hover:bg-background-card/80 ${selectedNote?.id === note.id ? 'ring-2 ring-primary' : ''}`}
                            onClick={() => handleSelectNote(note)}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">{note.title}</CardTitle>
                              <CardDescription className="text-xs">
                                Last updated: {new Date(note.updated_at).toLocaleDateString()}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-text-light line-clamp-3">{note.content}</p>
                              {note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {note.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                        
                        {notes.length > 3 && (
                          <div className="text-center pt-2">
                            <Button variant="ghost" size="sm" onClick={() => navigateToStudyTool('notes')}>
                              View all {notes.length} notes
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-text-light mb-4" />
                        <h3 className="text-lg font-medium mb-2">No notes yet</h3>
                        <p className="text-text-light mb-6 max-w-lg mx-auto">
                          Notes are the foundation of your study process. Create notes to capture key concepts,
                          then convert them to flashcards or use them for teach back practice.
                        </p>
                        <Button onClick={() => navigateToStudyTool('notes')} size="lg">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Note
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Selected Note Content Section */}
                <div className="bg-background-card rounded-xl shadow-sm border border-border">
                  <div className="border-b border-border p-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-primary" />
                      <h2 className="text-xl font-semibold">
                        {selectedNote ? `Note: ${selectedNote.title}` : 'Select a Note'}
                      </h2>
                    </div>
                    {selectedNote && (
                      isEditing ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSaveNote}
                            variant="default"
                            size="sm"
                            className="gap-2"
                            disabled={isSaving}
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditing(false)
                              setEditedNoteContent(selectedNote.content)
                      }}
                      variant="outline"
                            size="sm"
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                        </div>
                ) : (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                          size="sm"
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                          Edit Note
                        </Button>
                      )
                    )}
                  </div>
                  
                  <div className="p-6">
                    {selectedNote ? (
                      <article className="prose prose-lg max-w-none dark:prose-invert editor-container max-h-[600px] overflow-y-auto">
                        <DraftEditor
                          initialContent={isEditing ? editedNoteContent : selectedNote.content}
                          readOnly={!isEditing}
                          onChange={content => setEditedNoteContent(content)}
                        />
                      </article>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-text-light mb-4" />
                        <h3 className="text-lg font-medium mb-4">No note selected</h3>
                        <p className="text-text-light max-w-lg mx-auto">
                          Select a note from above to view and edit its content.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Sidebar for Study Tools - Takes up 1/4 of the space */}
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-primary">
                      <ScrollText className="h-5 w-5 mr-2" />
                      Flashcards
                    </CardTitle>
                    <CardDescription>
                      {selectedNote 
                        ? `Create flashcards from "${selectedNote.title}"`
                        : "Select a note to create flashcards"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm space-y-3">
                      <div className="flex items-start">
                        <div className="bg-primary/10 rounded-full p-1 mr-2 mt-0.5">
                          <ArrowRight className="h-3 w-3 text-primary" />
                        </div>
                        <p>Select text from your notes to create focused flashcards</p>
                      </div>
                      <div className="flex items-start">
                        <div className="bg-primary/10 rounded-full p-1 mr-2 mt-0.5">
                          <ArrowRight className="h-3 w-3 text-primary" />
                        </div>
                        <p>Automatically generate questions and answers</p>
                      </div>
                      <div className="flex items-start">
                        <div className="bg-primary/10 rounded-full p-1 mr-2 mt-0.5">
                          <ArrowRight className="h-3 w-3 text-primary" />
                        </div>
                        <p>Use spaced repetition to reinforce your learning</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => navigateToStudyTool('flashcards')}
                      disabled={!selectedNote}
                    >
                      {selectedNote ? "Create Flashcards" : "Select a Note First"}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-blue-500">
                      <Brain className="h-5 w-5 mr-2" />
                      Teach Back
                    </CardTitle>
                    <CardDescription>
                      {selectedNote 
                        ? `Teach concepts from "${selectedNote.title}"`
                        : "Select a note to practice teaching"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm space-y-3">
                      <div className="flex items-start">
                        <div className="bg-blue-500/10 rounded-full p-1 mr-2 mt-0.5">
                          <ArrowRight className="h-3 w-3 text-blue-500" />
                        </div>
                        <p>Use your notes as a starting point for teaching</p>
                      </div>
                      <div className="flex items-start">
                        <div className="bg-blue-500/10 rounded-full p-1 mr-2 mt-0.5">
                          <ArrowRight className="h-3 w-3 text-blue-500" />
                        </div>
                        <p>Explain the material in your own words</p>
                      </div>
                      <div className="flex items-start">
                        <div className="bg-blue-500/10 rounded-full p-1 mr-2 mt-0.5">
                          <ArrowRight className="h-3 w-3 text-blue-500" />
                        </div>
                        <p>Get feedback on your understanding</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => navigateToStudyTool('teach')}
                      disabled={!selectedNote}
                    >
                      {selectedNote ? "Teach from This Note" : "Select a Note First"}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
                
                <div className="bg-background-card rounded-xl shadow-sm border border-border p-5">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Info className="h-5 w-5 mr-2 text-text-light" />
                    Study Tips
                  </h3>
                  <ul className="space-y-2 text-sm text-text-light">
                    <li className="flex gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">1</div>
                      <p>Start by taking detailed notes on key concepts</p>
                    </li>
                    <li className="flex gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">2</div>
                      <p>Create flashcards from important points in your notes</p>
                    </li>
                    <li className="flex gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">3</div>
                      <p>Practice teaching concepts using the Teach Back feature</p>
                    </li>
                    <li className="flex gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">4</div>
                      <p>Review flashcards regularly using spaced repetition</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this module?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the module and all related activities. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  )
} 