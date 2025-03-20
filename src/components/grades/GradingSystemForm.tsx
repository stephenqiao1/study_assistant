'use client';

import { useState, useEffect } from 'react';

interface GradingSystemFormProps {
  initialValue?: number;
  onSubmit: (targetGrade: number) => void;
  onCancel: () => void;
  isUpdate?: boolean;
  externalValue?: number;
}

export default function GradingSystemForm({
  initialValue = 90,
  onSubmit,
  onCancel,
  isUpdate = false,
  externalValue
}: GradingSystemFormProps) {
  const [targetGrade, setTargetGrade] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  
  // Update target grade if external value changes
  useEffect(() => {
    if (externalValue !== undefined) {
      setTargetGrade(externalValue);
    }
  }, [externalValue]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the target grade
    if (targetGrade < 0 || targetGrade > 100) {
      setError('Target grade must be between 0 and 100');
      return;
    }
    
    onSubmit(targetGrade);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="targetGrade" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Target Grade (%)
        </label>
        <div className="flex items-center">
          <input
            type="number"
            id="targetGrade"
            value={targetGrade}
            onChange={(e) => setTargetGrade(Number(e.target.value))}
            min="0"
            max="100"
            step="0.1"
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          <span className="ml-2 text-gray-500 dark:text-gray-400">%</span>
        </div>
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Set your target grade for this course (0-100%).
        </p>
      </div>
      
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-800"
        >
          {isUpdate ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
} 