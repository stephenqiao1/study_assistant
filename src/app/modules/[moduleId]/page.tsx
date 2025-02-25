'use client'

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { notFound, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Link from "next/link";
import {
  Layers,
  ScrollText,
  Brain,
  Calculator,
  ArrowRight,
  FileText,
  Plus,
  Edit2,
  Save,
  X,
  Info,
  Trash2,
  Lightbulb,
  Tag,
  Search,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DraftEditor from "@/components/teach/DraftEditor";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import StudySessionsSidebar from '@/components/modules/StudySessionsSidebar'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import { useStudyDuration } from '@/hooks/useStudyDuration'
import { use } from 'react'
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
import { Input } from '@/components/ui/input'
import { isPremiumUser } from '@/utils/subscription-helpers'

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
  const [_recentNotes, setRecentNotes] = useState<NoteType[]>([])
  const [selectedNote, setSelectedNote] = useState<NoteType | null>(null)
  const [editedNoteContent, setEditedNoteContent] = useState('')
  const [editedNoteTitle, setEditedNoteTitle] = useState('')
  const [editedNoteTags, setEditedNoteTags] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredNotes, setFilteredNotes] = useState<NoteType[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [isCreatingNote, setIsCreatingNote] = useState(false)

  // State for view control
  const [_currentView, _setCurrentView] = useState<string>('overview')
  const [_showDeleteModal, _setShowDeleteModal] = useState(false)
  const [_isMenuOpen, _setIsMenuOpen] = useState(false)
  
  // Track study duration
  useStudyDuration(module?.id || '', 'module')

  const [isPremium, setIsPremium] = useState(false)
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false)

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
          const { data: noteData, error: _noteError } = await supabase
            .from('notes')
            .select('*')
            .eq('study_session_id', currentModule.id)
            .order('updated_at', { ascending: false })
            
          if (_noteError) {
            if (_noteError.code === '42P01') { // undefined_table
              // Notes table does not exist yet. This is expected on first run.
            } else {
              throw _noteError
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
        } catch (_error) {
          // Log error when fetching notes
          console.error("Error fetching notes:", _error);
          // Error fetching notes
        }
        
        setIsLoading(false)
      }
    }

    fetchModule()
  }, [moduleId, session])

  useEffect(() => {
    let filtered = [...notes]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) || 
        note.content.toLowerCase().includes(query)
      )
    }
    
    // Apply tag filter
    if (activeTag) {
      filtered = filtered.filter(note => 
        note.tags.includes(activeTag)
      )
    }
    
    setFilteredNotes(filtered)
    // Only update recentNotes if no filters are applied
    if (!searchQuery && !activeTag) {
      setRecentNotes(filtered.slice(0, 3))
    }
  }, [notes, searchQuery, activeTag])

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
    } catch (_error) {
      // Log error when deleting module
      console.error("Error deleting module:", _error);
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
    } catch (_error) {
      // Log error when saving module
      console.error("Error saving module:", _error);
      // Error saving module
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
    } catch (_error) {
      // Log error when saving description
      console.error("Error saving description:", _error);
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
      // Get module title for context
      const moduleTitle = module?.details?.title || 'this module';
      
      // Organize note content for better context
      const noteContents = notes.map(note => {
        return `Note: ${note.title}\nContent: ${note.content.slice(0, 500)}${note.content.length > 500 ? '...' : ''}\nTags: ${note.tags.join(', ')}`
      }).join('\n\n');
      
      // Call OpenAI with improved prompt
      const response = await fetch('/api/openai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteContents,
          prompt: `Based on these study notes for "${moduleTitle}", generate a concise and informative module description (max 150 words) that:
1. Summarizes the key concepts and themes
2. Highlights the main topics covered
3. Uses academic language appropriate for the subject matter
4. Maintains a neutral, informative tone
5. Includes no placeholder text or references to the notes themselves`
        })
      });
      
      if (!response.ok) {
        const _errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to generate description (${response.status})`);
      }
      
      const data = await response.json();
      if (!data.result) throw new Error('No description generated');
      
      // Set the generated description
      setEditedDescription(data.result);
      setIsEditingDescription(true);
      
      toast({
        title: "Description generated",
        description: "Review and save the AI-generated description.",
      })
    } catch (_error) {
      // Log error when generating description
      console.error("Error generating description:", _error);
      toast({
        title: "Failed to generate description",
        description: "There was a problem with the AI generation. Please try again or write a description manually.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false);
    }
  }
  
  const _navigateToStudyTool = (tool: string) => {
    if (tool === 'notes') {
      // Notes are now directly in the module page, so no need to navigate
      return;
    }
    router.push(`/modules/${moduleId}/${tool}`);
  }

  // Add function to handle saving note content
  const handleSaveNote = async () => {
    if (!session?.user?.id || !module?.id) return
    
    setIsSaving(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    
    try {
      if (selectedNote && !isCreatingNote) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: editedNoteTitle,
            content: editedNoteContent,
            tags: editedNoteTags,
            updated_at: now
          })
          .eq('id', selectedNote.id)
          
        if (error) throw error
        
        // Update local state
        const updatedNotes = notes.map(note => 
          note.id === selectedNote.id 
            ? { 
                ...note, 
                title: editedNoteTitle,
                content: editedNoteContent, 
                tags: editedNoteTags,
                updated_at: now 
              } 
            : note
        )
        
        setNotes(updatedNotes)
        setSelectedNote(prev => prev ? { 
          ...prev, 
          title: editedNoteTitle,
          content: editedNoteContent, 
          tags: editedNoteTags,
          updated_at: now 
        } : null)
        
        toast({
          title: "Note updated",
          description: "Your note has been saved.",
        })
      } else {
        // Create new note
        const { data: newNote, error } = await supabase
          .from('notes')
          .insert({
            study_session_id: module.id,
            user_id: session.user.id,
            title: editedNoteTitle,
            content: editedNoteContent,
            tags: editedNoteTags,
            created_at: now,
            updated_at: now
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Update local state with the new note
        setNotes(prev => [newNote, ...prev])
        setSelectedNote(newNote)
        
        toast({
          title: "Note created",
          description: "Your new note has been saved.",
        })
      }
      
      setIsCreatingNote(false)
      setIsEditing(false)
    } catch (_error) {
      // Log error when saving note
      console.error("Error saving note:", _error);
      toast({
        title: "Error saving note",
        description: "There was a problem saving your note.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleCreateNewNote = () => {
    setEditedNoteTitle('New Note')
    setEditedNoteContent('')
    setEditedNoteTags([])
    setNewTagInput('')
    setSelectedNote(null)
    setIsCreatingNote(true)
    setIsEditing(true)
  }

  const handleSelectNote = (note: NoteType) => {
    setSelectedNote(note)
    setEditedNoteTitle(note.title)
    setEditedNoteContent(note.content)
    setEditedNoteTags([...note.tags])
    setIsCreatingNote(false)
    setIsEditing(false)
  }

  const handleDeleteNote = async () => {
    if (!selectedNote || !session?.user?.id) return
    
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', selectedNote.id)
      
      if (error) throw error
      
      // Update local state
      setNotes(prev => prev.filter(note => note.id !== selectedNote.id))
      setSelectedNote(null)
      setIsCreatingNote(false)
      setIsEditing(false)
      
      toast({
        title: "Note deleted",
        description: "Your note has been deleted.",
      })
    } catch (_error) {
      // Log error when deleting note
      console.error("Error deleting note:", _error);
      toast({
        title: "Error deleting note",
        description: "There was a problem deleting your note.",
        variant: "destructive"
      })
    }
  }

  const handleAddTag = () => {
    if (newTagInput.trim() && !editedNoteTags.includes(newTagInput.trim())) {
      setEditedNoteTags(prev => [...prev, newTagInput.trim()])
      setNewTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedNoteTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleFilterByTag = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag)
  }

  // Check if the user is premium
  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!session?.user?.id) return
      
      try {
        const isPremium = await isPremiumUser(session.user.id)
        setIsPremium(isPremium)
      } catch (_error) {
        // Log error when checking premium status
        console.error("Error checking premium status:", _error);
        // Error checking premium status
      }
    }
    
    checkPremiumStatus()
  }, [session])
  
  // Show premium modal
  const showPremiumModal = () => {
    setIsPremiumDialogOpen(true)
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

      <AlertDialog open={isPremiumDialogOpen} onOpenChange={setIsPremiumDialogOpen}>
        <AlertDialogContent className="bg-background border-border shadow-lg !bg-opacity-100" style={{ backgroundColor: 'var(--background)', backdropFilter: 'none' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Premium Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Formula extraction is a premium feature. Upgrade to a premium plan to access this feature.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/pricing')}>
              View Pricing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                      Generate with AI
                    </Button>
                  </div>
                ) : (
                  <div className="mb-4">
                    <Input
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="mb-2 text-text dark:text-white dark:placeholder:text-gray-400"
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
            
            {/* Notes Section - Enhanced with full functionality */}
            <div className="mt-8">
              <div className="bg-background-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="border-b border-border p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    <h2 className="text-xl font-semibold">Notes</h2>
                    <Badge className="ml-3" variant="outline">{notes.length} notes</Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleCreateNewNote} 
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Note
                    </Button>
                  </div>
                </div>
                
                {/* Search and filter bar */}
                <div className="border-b border-border p-4 bg-background/50">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-text-light" />
                      <Input
                        placeholder="Search notes..."
                        className="pl-8 text-text dark:text-white dark:placeholder:text-gray-400"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {/* Tag filters */}
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(notes.flatMap(note => note.tags))).map(tag => (
                        <Badge 
                          key={tag} 
                          variant={activeTag === tag ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleFilterByTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {activeTag && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setActiveTag(null)}
                          className="h-6 px-2"
                        >
                          <X className="h-3 w-3 mr-1" /> Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Notes list */}
                <div className="p-6">
                  {notes.length > 0 ? (
                    <div className="space-y-4">
                      {(searchQuery || activeTag ? filteredNotes : notes).map(note => (
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
                      
                      {searchQuery || activeTag ? (
                        filteredNotes.length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-text-light">No notes match your filters</p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSearchQuery('');
                                setActiveTag(null);
                              }}
                              className="mt-2"
                            >
                              Clear filters
                            </Button>
                          </div>
                        )
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-text-light mb-4" />
                      <h3 className="text-lg font-medium mb-2">No notes yet</h3>
                      <p className="text-text-light mb-6 max-w-lg mx-auto">
                        Notes are the foundation of your study process. Create notes to capture key concepts,
                        then convert them to flashcards or use them for teach back practice.
                      </p>
                      <Button onClick={handleCreateNewNote} size="lg">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Note
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Selected Note or Create New Note Section */}
            {(selectedNote || isCreatingNote) && (
              <div className="mt-6 bg-background-card rounded-xl shadow-sm border border-border">
                <div className="border-b border-border p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    <h2 className="text-xl font-semibold">
                      {isCreatingNote ? "Create New Note" : isEditing ? "Edit Note" : `Note: ${selectedNote?.title}`}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    {isEditing || isCreatingNote ? (
                      <>
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
                            if (isCreatingNote) {
                              setIsCreatingNote(false);
                              setSelectedNote(null);
                            } else {
                              setIsEditing(false);
                              if (selectedNote) {
                                setEditedNoteContent(selectedNote.content);
                                setEditedNoteTitle(selectedNote.title);
                                setEditedNoteTags([...selectedNote.tags]);
                              }
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit Note
                        </Button>
                        <Button
                          onClick={handleDeleteNote}
                          variant="outline"
                          size="sm"
                          className="gap-2 border-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Title input when editing */}
                {(isEditing || isCreatingNote) && (
                  <div className="border-b border-border p-4">
                    <div className="flex flex-col space-y-3">
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={editedNoteTitle}
                        onChange={(e) => setEditedNoteTitle(e.target.value)}
                        placeholder="Note title"
                        className="text-text dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                )}
                
                {/* Tags section when editing */}
                {(isEditing || isCreatingNote) && (
                  <div className="border-b border-border p-4">
                    <div className="flex flex-col space-y-3">
                      <label className="text-sm font-medium flex items-center">
                        <Tag className="h-4 w-4 mr-1" />
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editedNoteTags.map(tag => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTag(tag);
                              }}
                              className="hover:text-destructive ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="Add a tag..."
                          className="text-text dark:text-white dark:placeholder:text-gray-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                        />
                        <Button
                          onClick={handleAddTag}
                          type="button"
                          variant="outline"
                          disabled={!newTagInput.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Note content */}
                <div className="p-6">
                  <article className="prose prose-lg max-w-none dark:prose-invert editor-container max-h-[400px] overflow-y-auto">
                    <DraftEditor
                      initialContent={isCreatingNote ? '' : (isEditing ? editedNoteContent : selectedNote?.content || '')}
                      readOnly={!isEditing && !isCreatingNote}
                      onChange={content => setEditedNoteContent(content)}
                    />
                  </article>
                </div>
                
                {/* Formula extraction section */}
                {!isCreatingNote && selectedNote && (
                  <div className="border-t border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calculator className="h-5 w-5 mr-2 text-primary" />
                        <h3 className="font-medium">Formula Extraction</h3>
                      </div>
                      <Link href={`/modules/${moduleId}/formulas`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <span>View Formula Sheet</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    <p className="text-sm text-text-light mt-2 mb-3">
                      Extract mathematical formulas from your notes to create a comprehensive formula sheet.
                      {!isPremium && <span className="text-primary font-medium"> Premium feature</span>}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={isPremium ? () => router.push(`/modules/${moduleId}/formulas`) : showPremiumModal}
                              className="gap-2"
                            >
                              <Calculator className="h-4 w-4" />
                              Extract Formulas
                              {!isPremium && <Crown className="h-3 w-3 ml-1" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isPremium 
                              ? <p>Generate a formula sheet from all your notes</p>
                              : <p>Upgrade to premium to extract formulas</p>
                            }
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="bg-primary/5 rounded-md p-3 text-sm mt-2">
                      <h4 className="font-medium flex items-center gap-1 mb-1">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        How to write mathematical formulas
                      </h4>
                      <p className="mb-2 text-xs">
                        Use LaTeX syntax in your notes to include mathematical formulas that will be extracted automatically.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="bg-background-card p-2 rounded-md">
                          <span className="font-medium">Inline formulas:</span>
                          <div className="mt-1 p-1 bg-background rounded-md">
                            Use single dollar signs: $...$
                          </div>
                        </div>
                        <div className="bg-background-card p-2 rounded-md">
                          <span className="font-medium">Block formulas:</span>
                          <div className="mt-1 p-1 bg-background rounded-md">
                            Use double dollar signs: $$...$$
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-primary">
                        After saving your notes with LaTeX formulas, click "Extract Formulas" to generate your formula sheet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Study Tools Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              {/* Flashcards Card */}
              <Link href={`/modules/${moduleId}/flashcards`}>
                <Card className="bg-background-card h-full p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Layers className="h-12 w-12 text-primary" />
                    <div>
                      <h3 className="text-lg font-medium">Flashcards</h3>
                      <p className="text-sm text-text-light mt-1">
                        Study with spaced repetition flashcards
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Teach Back Card */}
              <Link href={`/modules/${moduleId}/teach`}>
                <Card className="bg-background-card h-full p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Brain className="h-12 w-12 text-primary" />
                    <div>
                      <h3 className="text-lg font-medium">Teach Back</h3>
                      <p className="text-sm text-text-light mt-1">
                        Practice teaching concepts to reinforce learning
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
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