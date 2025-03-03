'use client'

import React from "react";
import { BookOpen, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  moduleName: string;
  activeSection: string;
  onActivateSection: (section: 'notes' | 'teachback' | 'flashcards' | 'module' | 'formulas' | 'videos') => void;
  onCreateNewNote: () => void;
  onOpenPdfModal: () => void;
}

export default function Sidebar({
  moduleName,
  activeSection,
  onActivateSection,
  onCreateNewNote,
  onOpenPdfModal
}: SidebarProps) {
  return (
    <div className="border-r p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-2">
        <h2 className="text-xl font-bold">{moduleName || 'Untitled Module'}</h2>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <Button 
          size="sm" 
          variant={activeSection === 'module' ? 'default' : 'outline'}
          onClick={() => onActivateSection('module')}
          className="px-2 py-1 h-8 text-xs"
        >
          <BookOpen className="h-3 w-3 mr-1" /> Module
        </Button>
        <Button 
          size="sm"
          variant={activeSection === 'formulas' ? 'default' : 'outline'}
          onClick={() => onActivateSection('formulas')}
          className="px-2 py-1 h-8 text-xs"
        >
          <FileText className="h-3 w-3 mr-1" /> Formula
        </Button>
        <Button 
          size="sm"
          variant="outline"
          onClick={onOpenPdfModal}
          title="Import notes from PDF"
          className="px-2 py-1 h-8 text-xs"
        >
          <FileText className="h-3 w-3 mr-1" /> Import PDF
        </Button>
        <Button 
          size="sm" 
          onClick={onCreateNewNote} 
          className="px-2 py-1 h-8 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" /> New
        </Button>
      </div>
    </div>
  );
} 