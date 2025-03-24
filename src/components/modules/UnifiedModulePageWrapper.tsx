'use client';

import UnifiedModulePage from './UnifiedModulePage';
import FloatingReminderIndicator from '@/components/reminders/FloatingReminderIndicator';
import FloatingGradeIndicator from '@/components/grades/FloatingGradeIndicator';
import { Module, StudySession } from '@/types/study';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface NoteType {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  images?: NoteImageType[];
}

interface NoteImageType {
  url: string;
  name: string;
  size: number;
  type: string;
  created_at: string;
}

interface UnifiedModulePageWrapperProps {
  module: Module;
  allSessions: StudySession[];
  notes: NoteType[];
  isPremiumUser: boolean;
  userId: string;
}

export default function UnifiedModulePageWrapper({ module, allSessions, notes, isPremiumUser, userId }: UnifiedModulePageWrapperProps) {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const [_isReminderExpanded, setIsReminderExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'notes' | 'teachback' | 'flashcards' | 'module' | 'formulas' | 'videos' | 'practice' | 'noteFlashcards' | 'grades' | 'reminders'>('notes');
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    if (module?.id) {
      console.log('Module ID for reminders:', module.id);
    }
  }, [module?.id]);

  // Determine if the grade indicator should be shown
  const shouldShowGradeIndicator = tab !== 'grades' && module && activeSection === 'notes' && !isEditing;

  return (
    <div className="relative">
      <UnifiedModulePage
        module={module}
        _allSessions={allSessions}
        notes={notes}
        isPremiumUser={isPremiumUser}
        userId={userId}
        onSectionChange={setActiveSection}
        onEditModeChange={setIsEditing}
      />
      
      {/* Grade indicator at the bottom left - only show on notes page and when not editing */}
      {shouldShowGradeIndicator && (
        <div className="fixed bottom-4 left-4 z-50">
          <FloatingGradeIndicator 
            studySessionId={module.id} 
            onExpand={() => {}} // Always unminimized
            alwaysExpanded={true}
          />
        </div>
      )}

      {/* Reminder indicator at the bottom right */}
      {tab !== 'reminders' && module && (
        <div className="fixed bottom-4 right-4 z-50">
          <FloatingReminderIndicator
            moduleId={module.id}
            onExpand={(expanded: boolean) => setIsReminderExpanded(expanded)}
          />
        </div>
      )}
    </div>
  );
}