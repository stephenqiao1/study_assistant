'use client'

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { 
  Edit2, 
  Save, 
  X, 
  Trash2, 
  Tag, 
  Plus 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card as _Card, CardContent as _CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DraftEditor from "@/components/teach/DraftEditor";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import NotesList from './NotesList';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface NotesSectionProps {
  notes: Note[];
  studySessionId: string;
  activeSection: string;
  renderLatex: (content: string) => string;
  onSelectStudyTool: (tool: 'teachback' | 'flashcards' | 'module' | 'formulas' | 'videos') => void;
  onNotesUpdated: (notes: Note[]) => void;
}

export default function NotesSection({ 
  notes: initialNotes, 
  studySessionId, 
  activeSection,
  renderLatex,
  onSelectStudyTool,
  onNotesUpdated
}: NotesSectionProps) {
  const supabase = createClient();
  const { toast } = useToast();
  
  // State variables
  const [notes, setNotes] = useState<Note[]>(initialNotes || []);
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes.length > 0 ? notes[0] : null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(selectedNote?.content || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(notes);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle saving a note
  const handleSaveNote = async () => {
    if (!selectedNote) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          content: editedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedNote.id);
        
      if (error) throw error;
      
      // Update local state
      const updatedNotes = notes.map(note => 
        note.id === selectedNote.id 
          ? { ...note, content: editedContent, updated_at: new Date().toISOString() } 
          : note
      );
      
      setNotes(updatedNotes);
      setFilteredNotes(applyFilter(updatedNotes, selectedTag));
      setSelectedNote({ ...selectedNote, content: editedContent, updated_at: new Date().toISOString() });
      setEditMode(false);
      
      onNotesUpdated(updatedNotes);
      
      toast({
        title: "Note updated",
        description: "Your note has been saved successfully."
      });
    } catch (error) {
      console.error("Error updating note:", error);
      toast({
        title: "Error",
        description: "Failed to save your note. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle creating a new note
  const handleCreateNewNote = async () => {
    setIsLoading(true);
    try {
      const newNote = {
        title: "New Note",
        content: "Start typing your note here...",
        tags: [],
        study_session_id: studySessionId
      };
      
      const { data, error } = await supabase
        .from('notes')
        .insert(newNote)
        .select();
        
      if (error) throw error;
      
      const createdNote = data[0];
      
      // Update local state
      const updatedNotes = [createdNote, ...notes];
      setNotes(updatedNotes);
      setFilteredNotes(applyFilter(updatedNotes, selectedTag));
      setSelectedNote(createdNote);
      setEditedContent(createdNote.content);
      setEditMode(true);
      
      onNotesUpdated(updatedNotes);
      
      toast({
        title: "Note created",
        description: "Your new note has been created."
      });
    } catch (error) {
      console.error("Error creating note:", error);
      toast({
        title: "Error",
        description: "Failed to create a new note. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle selecting a note
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setEditedContent(note.content);
    setEditMode(false);
  };
  
  // Handle deleting a note
  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', selectedNote.id);
        
      if (error) throw error;
      
      // Update local state
      const updatedNotes = notes.filter(note => note.id !== selectedNote.id);
      setNotes(updatedNotes);
      setFilteredNotes(applyFilter(updatedNotes, selectedTag));
      setSelectedNote(updatedNotes.length > 0 ? updatedNotes[0] : null);
      setEditedContent(updatedNotes.length > 0 ? updatedNotes[0].content : '');
      setShowDeleteConfirm(false);
      
      onNotesUpdated(updatedNotes);
      
      toast({
        title: "Note deleted",
        description: "Your note has been deleted."
      });
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle adding a tag
  const handleAddTag = async () => {
    if (!selectedNote) return;
    
    const newTag = tagInput.trim();
    if (!newTag) return;
    
    if (selectedNote.tags.includes(newTag)) {
      toast({
        title: "Tag already exists",
        description: "This tag has already been added to the note.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const updatedTags = [...selectedNote.tags, newTag];
      
      const { error } = await supabase
        .from('notes')
        .update({
          tags: updatedTags
        })
        .eq('id', selectedNote.id);
        
      if (error) throw error;
      
      // Update local state
      const updatedNotes = notes.map(note => 
        note.id === selectedNote.id 
          ? { ...note, tags: updatedTags } 
          : note
      );
      
      setNotes(updatedNotes);
      setFilteredNotes(applyFilter(updatedNotes, selectedTag));
      setSelectedNote({ ...selectedNote, tags: updatedTags });
      setTagInput('');
      
      onNotesUpdated(updatedNotes);
      
      toast({
        title: "Tag added",
        description: `Tag "${newTag}" has been added to your note.`
      });
    } catch (error) {
      console.error("Error adding tag:", error);
      toast({
        title: "Error",
        description: "Failed to add tag. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle removing a tag
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedNote) return;
    
    setIsLoading(true);
    try {
      const updatedTags = selectedNote.tags.filter(tag => tag !== tagToRemove);
      
      const { error } = await supabase
        .from('notes')
        .update({
          tags: updatedTags
        })
        .eq('id', selectedNote.id);
        
      if (error) throw error;
      
      // Update local state
      const updatedNotes = notes.map(note => 
        note.id === selectedNote.id 
          ? { ...note, tags: updatedTags } 
          : note
      );
      
      setNotes(updatedNotes);
      setFilteredNotes(applyFilter(updatedNotes, selectedTag));
      setSelectedNote({ ...selectedNote, tags: updatedTags });
      
      onNotesUpdated(updatedNotes);
      
      toast({
        title: "Tag removed",
        description: `Tag "${tagToRemove}" has been removed from your note.`
      });
    } catch (error) {
      console.error("Error removing tag:", error);
      toast({
        title: "Error",
        description: "Failed to remove tag. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle filtering by tag
  const handleFilterByTag = (tag: string | null) => {
    setSelectedTag(tag);
    setFilteredNotes(applyFilter(notes, tag));
  };
  
  // Apply filter based on selected tag
  const applyFilter = (notesList: Note[], tag: string | null) => {
    if (!tag) return notesList;
    return notesList.filter(note => note.tags.includes(tag));
  };
  
  // Strip LaTeX for displaying in previews
  const stripLatex = (content: string) => {
    return content
      .replace(/\$\$(.*?)\$\$/g, '[Formula]')
      .replace(/\$(.*?)\$/g, '[Formula]');
  };

  if (activeSection !== 'notes') {
    return null;
  }
  
  return (
    <div className="flex h-full">
      <NotesList 
        notes={filteredNotes}
        selectedNote={selectedNote}
        selectedTag={selectedTag}
        allTags={Array.from(new Set(notes.flatMap(note => note.tags)))}
        onSelectNote={handleSelectNote}
        onFilterByTag={handleFilterByTag}
        onCreateNewNote={handleCreateNewNote}
        onSelectStudyTool={onSelectStudyTool}
        stripLatex={stripLatex}
      />
      
      {/* Main content area */}
      {selectedNote ? (
        <div className="w-3/4 overflow-auto">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">{selectedNote.title}</h1>
              <div className="flex space-x-2">
                {editMode ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditMode(false);
                        setEditedContent(selectedNote.content);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveNote}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditMode(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-2 flex space-x-2">
              {selectedNote.tags && selectedNote.tags.map(tag => (
                <Badge key={tag} className="flex items-center space-x-1">
                  <span>{tag}</span>
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                  />
                </Badge>
              ))}
              <div className="flex space-x-1">
                <Input
                  className="h-6 w-24 text-xs"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTag();
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={handleAddTag}
                >
                  <Tag className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-4 flex-1">
            {editMode ? (
              <DraftEditor
                initialContent={editedContent}
                onChange={setEditedContent}
              />
            ) : (
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: renderLatex(selectedNote.content || '') 
                }} 
              />
            )}
          </div>
        </div>
      ) : (
        <div className="w-3/4 flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">No Note Selected</h2>
            <p className="text-gray-500 mb-4">Select a note from the list or create a new one.</p>
            <Button onClick={handleCreateNewNote}>
              <Plus className="h-4 w-4 mr-1" /> Create New Note
            </Button>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this note. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote}>
              {isLoading ? (
                <div className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 