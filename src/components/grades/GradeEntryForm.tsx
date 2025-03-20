'use client';

import { useState } from 'react';

interface GradeEntryFormProps {
  initialName?: string;
  initialScore?: number;
  initialMaxScore?: number;
  initialDate?: string;
  onSubmit: (name: string, score: number, maxScore: number, date: string) => void;
  onCancel: () => void;
  isUpdate?: boolean;
}

export default function GradeEntryForm({
  initialName = '',
  initialScore = 0,
  initialMaxScore = 100,
  initialDate = new Date().toISOString().split('T')[0],
  onSubmit,
  onCancel,
  isUpdate = false
}: GradeEntryFormProps) {
  const [name, setName] = useState(initialName);
  const [score, setScore] = useState(initialScore);
  const [maxScore, setMaxScore] = useState(initialMaxScore);
  const [date, setDate] = useState(initialDate);
  const [errors, setErrors] = useState<{
    name?: string;
    score?: string;
    maxScore?: string;
    date?: string;
  }>({});
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the form
    const newErrors: {
      name?: string;
      score?: string;
      maxScore?: string;
      date?: string;
    } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (score < 0) {
      newErrors.score = 'Score must be a positive number';
    }
    
    if (maxScore <= 0) {
      newErrors.maxScore = 'Maximum score must be greater than 0';
    }
    
    if (score > maxScore) {
      newErrors.score = 'Score cannot be greater than maximum score';
    }
    
    if (!date) {
      newErrors.date = 'Date is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(name, score, maxScore, date);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="entryName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name
        </label>
        <input
          type="text"
          id="entryName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Quiz 1, Homework 2, Midterm"
          className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="entryScore" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Score
          </label>
          <input
            type="number"
            id="entryScore"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            min="0"
            step="0.1"
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          {errors.score && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.score}</p>}
        </div>
        
        <div>
          <label htmlFor="entryMaxScore" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Maximum Score
          </label>
          <input
            type="number"
            id="entryMaxScore"
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value))}
            min="0.1"
            step="0.1"
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          {errors.maxScore && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.maxScore}</p>}
        </div>
      </div>
      
      <div>
        <label htmlFor="entryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date
        </label>
        <input
          type="date"
          id="entryDate"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
        {errors.date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>}
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
          {isUpdate ? 'Update' : 'Add'} Grade
        </button>
      </div>
    </form>
  );
} 