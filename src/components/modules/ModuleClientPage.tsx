'use client'

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import {
  Brain,
  ArrowRight,
  FileText,
  Plus,
  Edit2,
  Save,
  X,
  Trash2,
  Tag,
  Search,
  FileUp,
  Loader2,
  FlipHorizontal,
  PenLine,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StudySessionsSidebar from '@/components/modules/StudySessionsSidebar'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import { useStudyDuration } from '@/hooks/useStudyDuration'
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
import PdfUploadModal from '@/components/modules/PdfUploadModal'

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

interface ModuleClientPageProps {
  module: Module
  allSessions: Module[]
  notes: NoteType[]
  _isPremiumUser: boolean
  userId: string
}

export default function ModuleClientPage({ module, allSessions, notes, _isPremiumUser, userId }: ModuleClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  // State variables
  const [isLoading, setIsLoading] = useState(false);
  const [_editMode, setEditMode] = useState(false);
  const [_editedContent, _setEditedContent] = useState(module.details.content);
  const [editedDescription, setEditedDescription] = useState(module.details.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeNote, setActiveNote] = useState<NoteType | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [allNotes, setAllNotes] = useState<NoteType[]>(notes || []);
  const [filteredNotes, setFilteredNotes] = useState<NoteType[]>(notes || []);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);
  const [showPdfUploadModal, setShowPdfUploadModal] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  
  // Track study time with the correct activity type
  useStudyDuration(module.id, 'module');

  // Handler functions
  const handleDelete = async () => {
    if (!module.module_title) return;

    setIsDeleting(true);
    try {
      // Delete all study sessions with this module title
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('module_title', module.module_title)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      toast({
        title: "Module deleted",
        description: "The module has been successfully deleted.",
      });
      
      router.push('/modules');
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: "Error deleting module",
        description: "Could not delete the module. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const _handleSave = async () => {
    if (!module.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          details: {
            ...module.details,
            content: _editedContent
          }
        })
        .eq('id', module.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Changes saved",
        description: "Your changes have been successfully saved.",
      });
      
      setEditMode(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error saving changes",
        description: "Could not save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!module.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          details: {
            ...module.details,
            description: editedDescription
          }
        })
        .eq('id', module.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Description saved",
        description: "Your description has been successfully saved.",
      });
      
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Error saving description:', error);
      toast({
        title: "Error saving description",
        description: "Could not save description. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!module.details.content) {
      toast({
        title: "Cannot generate description",
        description: "The module content is empty. Please add some content first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/modules/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moduleContent: module.details.content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate description');
      }

      const data = await response.json();
      setEditedDescription(data.description);
      setIsEditingDescription(true);
      
      toast({
        title: "Description generated",
        description: "A description has been generated. You can edit it before saving.",
      });
    } catch (error) {
      console.error('Error generating description:', error);
      toast({
        title: "Error generating description",
        description: "Could not generate a description. Please try again or write your own.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setShowGenerateConfirm(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      toast({
        title: "Note title required",
        description: "Please enter a title for your note.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isEditingNote && activeNote?.id) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: noteTitle,
            content: noteContent,
            tags: noteTags,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeNote.id);

        if (error) throw error;

        // Update local state
        const updatedNotes = allNotes.map(note => 
          note.id === activeNote.id 
            ? { ...note, title: noteTitle, content: noteContent, tags: noteTags, updated_at: new Date().toISOString() }
            : note
        );
        
        setAllNotes(updatedNotes);
        setFilteredNotes(activeTag ? updatedNotes.filter(note => note.tags.includes(activeTag)) : updatedNotes);
        
        toast({
          title: "Note updated",
          description: "Your note has been successfully updated.",
        });
      } else {
        // Create new note
        const { data, error } = await supabase
          .from('notes')
          .insert({
            study_session_id: module.id,
            title: noteTitle,
            content: noteContent,
            tags: noteTags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) throw error;

        const newNote = data[0] as NoteType;
        
        // Update local state
        const updatedNotes = [newNote, ...allNotes];
        setAllNotes(updatedNotes);
        setFilteredNotes(activeTag ? updatedNotes.filter(note => note.tags.includes(activeTag)) : updatedNotes);
        
        toast({
          title: "Note created",
          description: "Your note has been successfully created.",
        });
      }

      // Reset form
      setNoteTitle('');
      setNoteContent('');
      setNoteTags([]);
      setIsEditingNote(false);
      setActiveNote(null);
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Error saving note",
        description: "Could not save the note. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewNote = () => {
    setActiveNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setIsEditingNote(false);
    setIsPreviewMode(false);
  };

  const handleSelectNote = (note: NoteType) => {
    setActiveNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTags(note.tags || []);
    setIsEditingNote(true);
    setIsPreviewMode(true);
  };

  const handleDeleteNote = async () => {
    if (!activeNote?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', activeNote.id);

      if (error) throw error;

      // Update local state
      const updatedNotes = allNotes.filter(note => note.id !== activeNote.id);
      setAllNotes(updatedNotes);
      setFilteredNotes(activeTag ? updatedNotes.filter(note => note.tags.includes(activeTag)) : updatedNotes);
      
      toast({
        title: "Note deleted",
        description: "Your note has been successfully deleted.",
      });

      // Reset form
      setNoteTitle('');
      setNoteContent('');
      setNoteTags([]);
      setIsEditingNote(false);
      setActiveNote(null);
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error deleting note",
        description: "Could not delete the note. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setShowDeleteNoteConfirm(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !noteTags.includes(tagInput.trim())) {
      setNoteTags([...noteTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNoteTags(noteTags.filter(tag => tag !== tagToRemove));
  };

  const handleFilterByTag = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag(null);
      setFilteredNotes(allNotes);
    } else {
      setActiveTag(tag);
      setFilteredNotes(allNotes.filter(note => note.tags.includes(tag)));
    }
  };

  // Render UI components
  return (
    <div className="flex flex-col min-h-screen bg-background text-text">
      <Navbar />
      
      <main className="flex-1 flex pt-16">
        <StudySessionsSidebar sessions={allSessions} />
        
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Module Header */}
            <div className="bg-background-card rounded-xl shadow-sm border border-border p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">{module.details.title}</h1>
                  
                  {isEditingDescription ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full p-3 border rounded-md bg-input text-text focus:border-primary"
                        rows={3}
                      />
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleSaveDescription}
                          disabled={isLoading}
                          className="gap-2"
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Description
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsEditingDescription(false);
                            setEditedDescription(module.details.description || '');
                          }}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <p className="text-muted-foreground text-lg mb-2">
                        {module.details.description || 'No description provided. Click to add one.'}
                      </p>
                      <div className="absolute top-0 right-0 hidden group-hover:flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setIsEditingDescription(true)}
                          className="rounded-full h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowGenerateConfirm(true)}
                          className="rounded-full h-8 w-8 p-0"
                        >
                          <Brain className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowPdfUploadModal(true)}
                  >
                    <FileUp className="h-4 w-4" /> Upload PDF
                  </Button>
                  
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete Module
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Enhanced Notes Section - Moved above Study Tools */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary" /> 
                  <h2 className="text-2xl font-semibold">Notes</h2>
                </div>
                <Button 
                  onClick={handleCreateNewNote} 
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> New Note
                </Button>
              </div>
              
              <div className="grid grid-cols-12 gap-5 bg-background-card shadow-sm border border-border rounded-lg">
                {/* Left Sidebar - Note List */}
                <div className="col-span-12 md:col-span-3 border-r border-border">
                  <div className="p-4">
                    <div className="relative mb-4">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search notes..." 
                        className="pl-9"
                        // Add search functionality if needed
                      />
                    </div>
                  
                    {/* Tag filtering */}
                    {Array.from(new Set(allNotes.flatMap(note => note.tags || []))).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {Array.from(new Set(allNotes.flatMap(note => note.tags || []))).map(tag => (
                          <Badge
                            key={tag}
                            variant={activeTag === tag ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => handleFilterByTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                        {activeTag && (
                          <Badge
                            variant="outline"
                            className="cursor-pointer text-xs"
                            onClick={() => {
                              setActiveTag(null);
                              setFilteredNotes(allNotes);
                            }}
                          >
                            <X className="mr-1 h-3 w-3" /> Clear
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Note list */}
                    <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                      {filteredNotes.length > 0 ? (
                        filteredNotes.map(note => (
                          <div
                            key={note.id}
                            className={`p-3 mb-2 rounded-md cursor-pointer transition-colors ${
                              activeNote?.id === note.id
                                ? 'bg-primary/10 border-l-2 border-l-primary'
                                : 'hover:bg-background border border-border'
                            }`}
                            onClick={() => handleSelectNote(note)}
                          >
                            <div className="font-medium line-clamp-1">{note.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{note.content}</div>
                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                              <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                              {note.tags?.length > 0 && (
                                <span>{note.tags.length} tag{note.tags.length !== 1 ? 's' : ''}</span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center p-6 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                          No notes yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Middle Section - Note Editor/Viewer */}
                <div className="col-span-12 md:col-span-6 p-5 border-r border-border">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Input
                        id="note-title"
                        placeholder="Note title"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        className="w-full text-lg font-medium border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                        disabled={isPreviewMode && activeNote !== null}
                      />
                      
                      {activeNote !== null && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setIsPreviewMode(!isPreviewMode)}
                          className="ml-2 gap-2"
                        >
                          {isPreviewMode ? (
                            <><Edit2 className="h-4 w-4" /> Edit</>
                          ) : (
                            <><Eye className="h-4 w-4" /> Preview</>
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {isPreviewMode && activeNote !== null ? (
                      // Preview mode
                      <div className="prose prose-sm dark:prose-invert max-w-none min-h-[calc(100vh-400px)] p-3 border rounded-md bg-background/50 overflow-auto">
                        {noteContent.split('\n').map((paragraph, idx) => (
                          paragraph.trim() === '' ? 
                            <br key={idx} /> : 
                            <p key={idx}>{paragraph}</p>
                        ))}
                      </div>
                    ) : (
                      // Edit mode
                      <div className="relative">
                        <textarea
                          id="note-content"
                          placeholder="Start typing your note here..."
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          className="w-full h-[calc(100vh-400px)] p-3 border rounded-md bg-background/50 text-text focus:border-primary resize-none"
                        />
                        
                        <div className="absolute bottom-4 right-4 flex gap-2">
                          {isEditingNote ? (
                            <>
                              <Button
                                onClick={handleSaveNote}
                                disabled={isLoading}
                                className="gap-2"
                              >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Update Note
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => setShowDeleteNoteConfirm(true)}
                                size="icon"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={handleSaveNote}
                              disabled={isLoading || !noteTitle.trim()}
                              className="gap-2"
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              Save Note
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right Sidebar - Tags & Metadata */}
                <div className="col-span-12 md:col-span-3 p-4">
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                      <div className="flex gap-2 flex-wrap mb-3">
                        {noteTags.map(tag => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <button 
                              onClick={() => handleRemoveTag(tag)}
                              className="rounded-full w-4 h-4 flex items-center justify-center bg-secondary-foreground/10 hover:bg-secondary-foreground/20"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {noteTags.length === 0 && (
                          <span className="text-sm text-muted-foreground">No tags added yet</span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          id="note-tags"
                          placeholder="Add tag and press Enter"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                          className="flex-1 text-sm"
                        />
                        <Button onClick={handleAddTag} variant="outline" size="sm" className="shrink-0">
                          <Tag className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {activeNote && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Metadata</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Created:</span>
                            <span>{new Date(activeNote.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Updated:</span>
                            <span>{new Date(activeNote.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Study Tools Grid - Now after Notes */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
              {/* Flashcards */}
              <Card className="bg-background-card dark:bg-gray-800 shadow-sm hover:shadow border border-border">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="flex items-center text-lg font-medium text-text dark:text-white">
                    <FlipHorizontal className="mr-2 h-5 w-5" />
                    Flashcards
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-sm text-text-light dark:text-gray-300">
                    Create and review flashcards with spaced repetition
                  </p>
                </CardContent>
                <CardFooter className="p-5 pt-0">
                  <Link href={`/modules/${module.id}/flashcards?title=${encodeURIComponent(module.module_title)}`}>
                    <Button className="w-full">
                      Open Flashcards
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Formulas */}
              <Card className="bg-background-card dark:bg-gray-800 shadow-sm hover:shadow border border-border">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="flex items-center text-lg font-medium text-text dark:text-white">
                    <svg className="mr-2 h-5 w-5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 9V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h5" />
                      <path d="M17 2v4" />
                      <path d="M7 2v4" />
                      <path d="M14 16h2m4 0h.01" />
                      <path d="M15 12h5" />
                      <path d="M18 20v.01" />
                      <path d="M21 16a2 2 0 0 1 .01 0" />
                    </svg>
                    Formulas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-sm text-text-light dark:text-gray-300">
                    Access and organize mathematical formulas and equations
                  </p>
                </CardContent>
                <CardFooter className="p-5 pt-0">
                  <Link href={`/modules/${module.id}/formulas?title=${encodeURIComponent(module.module_title)}`}>
                    <Button className="w-full">
                      View Formulas
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Teach-back */}
              <Card className="bg-background-card dark:bg-gray-800 shadow-sm hover:shadow border border-border">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="flex items-center text-lg font-medium text-text dark:text-white">
                    <PenLine className="mr-2 h-5 w-5" />
                    Teach-back
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-sm text-text-light dark:text-gray-300">
                    Test your understanding by teaching concepts back
                  </p>
                </CardContent>
                <CardFooter className="p-5 pt-0">
                  <Link href={`/modules/${module.id}/teach?title=${encodeURIComponent(module.module_title)}`}>
                    <Button className="w-full">
                      Start Teach-back
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
              
              {/* Videos */}
              <Card className="bg-background-card dark:bg-gray-800 shadow-sm hover:shadow border border-border">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="flex items-center text-lg font-medium text-text dark:text-white">
                    <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    Videos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-sm text-text-light dark:text-gray-300">
                    Add and organize related videos with automatic transcripts
                  </p>
                </CardContent>
                <CardFooter className="p-5 pt-0">
                  <Link href={`/modules/${module.id}/videos?title=${encodeURIComponent(module.module_title)}`}>
                    <Button className="w-full">
                      Manage Videos
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the module and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete note confirmation */}
      <AlertDialog open={showDeleteNoteConfirm} onOpenChange={setShowDeleteNoteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Generate description confirmation */}
      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Description</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a description based on your module content. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateDescription} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* PDF Upload Modal */}
      {showPdfUploadModal && (
        <PdfUploadModal
          isOpen={showPdfUploadModal}
          onClose={() => setShowPdfUploadModal(false)}
          studySessionId={module.id}
          onNotesCreated={() => {
            setShowPdfUploadModal(false);
            // Refresh the module data
            router.refresh();
          }}
        />
      )}
    </div>
  );
} 