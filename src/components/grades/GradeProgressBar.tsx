'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { GradeStatus } from '@/types/grading';
import { getGradeStatus } from '@/utils/gradeCalculations';

interface GradeProgressBarProps {
  grade: number;
  targetGrade?: number;
}

export default function GradeProgressBar({ grade, targetGrade = 100 }: GradeProgressBarProps) {
  const status: GradeStatus = getGradeStatus(grade, targetGrade);
  
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

  return (
    <div className="w-full">
      <Progress 
        value={grade} 
        max={targetGrade}
        className={`h-2 ${getStatusColor(status)}`}
      />
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{grade.toFixed(1)}%</span>
        <span>Target: {targetGrade}%</span>
      </div>
    </div>
  );
} 