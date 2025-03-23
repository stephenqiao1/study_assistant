'use client';

import { useState, useEffect } from 'react';
import { GradingSystemWithComponents, GradeStatus } from '@/types/grading';
import { calculateOverallGrade, getGradeStatus, formatGrade } from '@/utils/gradeCalculations';
import { ChevronDown, Target, BarChart2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FloatingGradeIndicatorProps {
  studySessionId: string;
  onExpand?: (expanded: boolean) => void;
  alwaysExpanded?: boolean;
}

export default function FloatingGradeIndicator({ studySessionId, onExpand, alwaysExpanded }: FloatingGradeIndicatorProps) {
  const _router = useRouter();
  const [gradingSystem, setGradingSystem] = useState<GradingSystemWithComponents | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(!alwaysExpanded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (alwaysExpanded) {
      setIsMinimized(false);
    }
  }, [alwaysExpanded]);

  useEffect(() => {
    onExpand?.(!isMinimized);
  }, [isMinimized, onExpand]);

  // Fetch the grading system for this study session
  useEffect(() => {
    const fetchGradingSystem = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/grading-systems?study_session_id=${studySessionId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch grading system');
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          setGradingSystem(data.data[0]);
        } else {
          setGradingSystem(null);
        }
      } catch (err) {
        console.error('Error fetching grading system:', err);
        setError('Failed to load grade information');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (studySessionId) {
      fetchGradingSystem();
    }
  }, [studySessionId]);

  // Calculate the overall grade
  const gradeInfo = gradingSystem ? calculateOverallGrade(gradingSystem) : null;
  const gradeStatus = gradeInfo ? getGradeStatus(gradeInfo.currentGrade, gradeInfo.targetGrade) : null;

  // If there's no grading system or an error, don't show anything
  if (!gradingSystem || !gradeInfo || error || isLoading) {
    return null;
  }

  const statusColors = {
    excellent: 'bg-green-500 dark:bg-green-600 dark:hover:bg-green-700',
    good: 'bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700',
    warning: 'bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700',
    danger: 'bg-red-500 dark:bg-red-600 dark:hover:bg-red-700',
  };

  const statusColor = statusColors[gradeStatus as GradeStatus] || 'bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700';

  return (
    <div 
      className={`rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
        isMinimized ? 'w-12 h-12' : 'w-64'
      }`}
    >
      {isMinimized ? (
        <button 
          onClick={() => !alwaysExpanded && setIsMinimized(false)}
          className={`w-full h-full flex items-center justify-center rounded-lg ${statusColor} text-gray-100 hover:opacity-90 transition-colors`}
          title="Show grade information"
        >
          <BarChart2 className="w-6 h-6" />
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800">
          <div className={`${statusColor} px-4 py-2 flex justify-between items-center`}>
            <h3 className="font-semibold text-sm text-gray-100">Current Grade</h3>
            {!alwaysExpanded && (
              <button 
                onClick={() => setIsMinimized(true)}
                className="text-gray-100 hover:bg-black/10 dark:hover:bg-white/10 rounded p-1 transition-colors"
                aria-label="Minimize"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="p-3">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <BarChart2 className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Current:</span>
              </div>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatGrade(gradeInfo.currentGrade)}%</span>
            </div>
            
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <Target className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Target:</span>
              </div>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatGrade(gradingSystem.target_grade)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${statusColor}`}
                style={{ width: `${Math.min(100, (gradeInfo.currentGrade / gradingSystem.target_grade) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 