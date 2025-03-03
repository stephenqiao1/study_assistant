'use client'

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input as _Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, FileText, Plus, Brain, ScrollText, Video } from "lucide-react";

interface NoteType {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface NotesSidebarProps {
  notes: NoteType[];
  filteredNotes: NoteType[];
  selectedNote: NoteType | null;
  moduleTitle: string;
  selectedTag: string | null;
  onCreateNote: () => void;
  onSelectNote: (note: NoteType) => void;
  onFilterByTag: (tag: string | null) => void;
  onActivateStudyTool: (tool: 'teachback' | 'flashcards' | 'module' | 'formulas' | 'videos') => void;
  onOpenPdfModal: () => void;
  stripLatex: (content: string) => string;
}

export default function NotesSidebar({
  notes,
  filteredNotes,
  selectedNote,
  moduleTitle,
  selectedTag,
  onCreateNote,
  onSelectNote,
  onFilterByTag,
  onActivateStudyTool,
  onOpenPdfModal,
  stripLatex
}: NotesSidebarProps) {
  return (
    <div className="w-1/4 border-r p-4 flex flex-col h-[calc(100vh-4rem)]" suppressHydrationWarning>
      <div className="mb-2">
        <h2 className="text-xl font-bold">{moduleTitle || 'Untitled Module'}</h2>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onActivateStudyTool('module')}
          suppressHydrationWarning
          className="px-2 py-1 h-8 text-xs"
        >
          <BookOpen className="h-3 w-3 mr-1" /> Module
        </Button>
        <Button 
          size="sm"
          variant="outline"
          onClick={() => onActivateStudyTool('formulas')}
          suppressHydrationWarning
          className="px-2 py-1 h-8 text-xs"
        >
          <FileText className="h-3 w-3 mr-1" /> Formula
        </Button>
        <Button 
          size="sm"
          variant="outline"
          onClick={() => onOpenPdfModal()}
          title="Import notes from PDF"
          suppressHydrationWarning
          className="px-2 py-1 h-8 text-xs"
        >
          <FileText className="h-3 w-3 mr-1" /> Import PDF
        </Button>
        <Button 
          size="sm" 
          onClick={onCreateNote} 
          suppressHydrationWarning
          className="px-2 py-1 h-8 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" /> New
        </Button>
      </div>
      
      {/* Tag filters - Replace with dropdown */}
      {notes.length > 0 && (
        <div className="mb-4">
          <Select
            value={selectedTag || "all_tags"}
            onValueChange={(value) => onFilterByTag(value === "all_tags" ? null : value)}
          >
            <SelectTrigger className="w-full" suppressHydrationWarning>
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_tags">All tags</SelectItem>
              {Array.from(new Set(notes.flatMap(note => note.tags))).map(tag => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Note cards */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {filteredNotes.length > 0 ? (
          filteredNotes.map(note => (
            <Card 
              key={note.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow ${selectedNote?.id === note.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
              onClick={() => onSelectNote(note)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-900 dark:text-white">{note.title}</h3>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 text-xs text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivateStudyTool('teachback');
                      }}
                    >
                      <Brain className="h-3 w-3 mr-1" /> Teach
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 text-xs text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivateStudyTool('flashcards');
                      }}
                    >
                      <ScrollText className="h-3 w-3 mr-1" /> Cards
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 text-xs text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNote(note);
                        onActivateStudyTool('videos');
                      }}
                    >
                      <Video className="h-3 w-3 mr-1" /> Videos
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-100 line-clamp-2">
                  {stripLatex(note.content || '')}
                </p>
                {note.tags && note.tags.length > 0 && (
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
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">No notes found</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={onCreateNote}
              suppressHydrationWarning
            >
              Create your first note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 