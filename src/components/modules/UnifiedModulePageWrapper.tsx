'use client';

import { useState, useEffect } from 'react';
import UnifiedModulePage from './UnifiedModulePage';
import FloatingGradeIndicator from '@/components/grades/FloatingGradeIndicator';
import { useSearchParams } from 'next/navigation';

interface UnifiedModulePageWrapperProps {
  module: any;
  allSessions: any[];
  notes: any[];
  isPremiumUser: boolean;
  userId: string;
}

export default function UnifiedModulePageWrapper({
  module,
  allSessions,
  notes,
  isPremiumUser,
  userId
}: UnifiedModulePageWrapperProps) {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  
  return (
    <div className="relative">
      <UnifiedModulePage
        module={module}
        _allSessions={allSessions}
        notes={notes}
        isPremiumUser={isPremiumUser}
        userId={userId}
      />
      
      {/* Add the floating grade indicator */}
      {tab !== 'grades' && module && (
        <FloatingGradeIndicator studySessionId={module.id} />
      )}
    </div>
  );
} 