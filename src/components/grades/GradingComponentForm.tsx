'use client';

import { useState } from 'react';

interface GradingComponentFormProps {
  initialName?: string;
  initialWeight?: number;
  availableWeight: number;
  onSubmit: (name: string, weight: number) => void;
  onCancel: () => void;
  isUpdate?: boolean;
}

export default function GradingComponentForm({
  initialName = '',
  initialWeight = 10,
  availableWeight,
  onSubmit,
  onCancel,
  isUpdate = false
}: GradingComponentFormProps) {
  const [name, setName] = useState(initialName);
  const [weight, setWeight] = useState(initialWeight);
  const [errors, setErrors] = useState<{
    name?: string;
    weight?: string;
  }>({});
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the form
    const newErrors: {
      name?: string;
      weight?: string;
    } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Component name is required';
    }
    
    if (weight <= 0) {
      newErrors.weight = 'Weight must be greater than 0';
    } else if (weight > availableWeight && !isUpdate) {
      newErrors.weight = `Weight cannot exceed available weight (${availableWeight.toFixed(1)}%)`;
    } else if (weight > 100) {
      newErrors.weight = 'Weight cannot exceed 100%';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(name, weight);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="componentName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Component Name
        </label>
        <input
          type="text"
          id="componentName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Midterm Exam, Assignments, Quizzes"
          className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
      </div>
      
      <div>
        <label htmlFor="componentWeight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Weight (%)
        </label>
        <div className="flex items-center">
          <input
            type="number"
            id="componentWeight"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            min="0"
            max="100"
            step="0.1"
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          <span className="ml-2 text-gray-500 dark:text-gray-400">%</span>
        </div>
        {errors.weight && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.weight}</p>}
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isUpdate 
            ? 'Specify the percentage this component contributes to your final grade.'
            : `Available weight: ${availableWeight.toFixed(1)}%`
          }
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
          {isUpdate ? 'Update' : 'Add'} Component
        </button>
      </div>
    </form>
  );
} 