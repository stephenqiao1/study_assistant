'use client';

import { GradeStatus } from '@/types/grading';
import { formatGrade } from '@/utils/gradeCalculations';

interface GradeProgressBarProps {
  currentGrade: number;
  targetGrade: number;
  status: GradeStatus;
}

export default function GradeProgressBar({ 
  currentGrade, 
  targetGrade, 
  status 
}: GradeProgressBarProps) {
  // Calculate the percentage for the progress bar (capped at 100%)
  const progressPercentage = Math.min(100, (currentGrade / 100) * 100);
  const targetPercentage = Math.min(100, (targetGrade / 100) * 100);
  
  // Determine the color based on status
  const getStatusColor = (status: GradeStatus) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'danger':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const progressColor = getStatusColor(status);
  
  return (
    <div className="w-full">
      <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        {/* Current grade progress */}
        <div 
          className={`absolute top-0 left-0 h-full ${progressColor} transition-all duration-500 ease-in-out`}
          style={{ width: `${progressPercentage}%` }}
        />
        
        {/* Target grade marker */}
        <div 
          className="absolute top-0 h-full w-1 bg-gray-800 dark:bg-gray-200 z-10 transition-all duration-500 ease-in-out"
          style={{ left: `${targetPercentage}%` }}
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-1 py-0.5 rounded">
            Target
          </div>
        </div>
        
        {/* Current grade label */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-sm font-medium text-white drop-shadow-md">
            {formatGrade(currentGrade)}% / {formatGrade(targetGrade)}%
          </span>
        </div>
      </div>
      
      {/* Grade scale */}
      <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
} 