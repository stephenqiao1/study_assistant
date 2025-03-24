'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedModulePage from './UnifiedModulePage';
import { useToast } from '@/components/ui/use-toast';
import FloatingReminderIndicator from '@/components/reminders/FloatingReminderIndicator';
import { Module as _Module, StudySession as _StudySession } from '@/types/study';
import { useSearchParams } from 'next/navigation';

interface _NoteType {
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
  module: {
    id: string;
    module_title: string;
    started_at: string;
    details: {
      title: string;
      content: string;
      description?: string;
      available_tools?: string[];
    };
  };
  _allSessions: _StudySession[];
  notes: _NoteType[];
  isPremiumUser: boolean;
  userId: string;
}

export default function UnifiedModulePageWrapper({ 
  module, 
  _allSessions, 
  notes, 
  isPremiumUser, 
  userId 
}: UnifiedModulePageWrapperProps) {
  const _router = useRouter();
  const { toast: _toast } = useToast();
  const [_activeSection, setActiveSection] = useState('overview');
  const [_isEditing, setIsEditing] = useState(false);
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const [_isReminderExpanded, setIsReminderExpanded] = useState(false);

  const handleActivateStudyTool = (toolType: string, _noteId?: string) => {
    setActiveSection(toolType);
    setIsEditing(false);
  };

  return (
    <div className="relative">
      <UnifiedModulePage
        module={module}
        _allSessions={_allSessions}
        notes={notes}
        isPremiumUser={isPremiumUser}
        userId={userId}
        onSectionChange={handleActivateStudyTool}
      />
      
      {/* Reminder indicator at the bottom right */}
      {tab !== 'reminders' && module.id && (
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