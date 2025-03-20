'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GradingSystemWithComponents, 
  GradingComponentWithEntries,
  GradeStatus
} from '@/types/grading';
import { 
  calculateOverallGrade, 
  getGradeStatus, 
  formatGrade,
  calculateRemainingWeight
} from '@/utils/gradeCalculations';
import GradeProgressBar from './GradeProgressBar';
import GradingComponentList from './GradingComponentList';
import GradingSystemForm from './GradingSystemForm';
import GradingComponentForm from './GradingComponentForm';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  PlusCircle, 
  MoreVertical, 
  Edit, 
  Trash2,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GradeTrackerProps {
  studySessionId: string;
  userId: string;
}

export default function GradeTracker({ studySessionId, userId }: GradeTrackerProps) {
  const router = useRouter();
  const [gradingSystem, setGradingSystem] = useState<GradingSystemWithComponents | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGradingSystemForm, setShowGradingSystemForm] = useState(false);
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [editingComponent, setEditingComponent] = useState<GradingComponentWithEntries | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
        setError('Failed to load grade information. Please try again later.');
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
  const remainingWeight = gradingSystem ? calculateRemainingWeight(gradingSystem.components) : 0;

  // Handle creating a new grading system
  const handleCreateGradingSystem = async (targetGrade: number) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/grading-systems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          study_session_id: studySessionId,
          target_grade: targetGrade,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create grading system');
      }
      
      const data = await response.json();
      
      // Create a new grading system
      const newGradingSystem = {
        ...data.data,
        components: [],
      };
      
      setGradingSystem(newGradingSystem);
      setShowGradingSystemForm(false);
      setStatusMessage({ type: 'success', message: 'Grading system created successfully! Now add your grading components.' });
      
      // Refresh the page to update the UI
      router.refresh();
    } catch (err: any) {
      console.error('Error creating grading system:', err);
      setStatusMessage({ type: 'error', message: err.message || 'Failed to create grading system' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle updating the target grade
  const handleUpdateTargetGrade = async (targetGrade: number) => {
    if (!gradingSystem) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/grading-systems', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: gradingSystem.id,
          target_grade: targetGrade,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update target grade');
      }
      
      const data = await response.json();
      
      setGradingSystem({
        ...gradingSystem,
        target_grade: data.data.target_grade,
      });
      
      setStatusMessage({ type: 'success', message: 'Target grade updated successfully!' });
    } catch (err: any) {
      console.error('Error updating target grade:', err);
      setStatusMessage({ type: 'error', message: err.message || 'Failed to update target grade' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating a new grading component
  const handleCreateComponent = async (name: string, weight: number) => {
    if (!gradingSystem) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/grading-components', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grading_system_id: gradingSystem.id,
          name,
          weight,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create component');
      }
      
      const data = await response.json();
      
      // Update the local state with the new component
      setGradingSystem({
        ...gradingSystem,
        components: [
          ...gradingSystem.components,
          {
            ...data.data,
            entries: [],
          },
        ],
      });
      
      // Close the component form
      setShowComponentForm(false);
      setStatusMessage({ type: 'success', message: 'Component created successfully!' });
    } catch (err: any) {
      console.error('Error creating component:', err);
      setStatusMessage({ type: 'error', message: err.message || 'Failed to create component' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle updating a grading component
  const handleUpdateComponent = async (id: string, name: string, weight: number) => {
    if (!gradingSystem) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/grading-components', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          name,
          weight,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update component');
      }
      
      const data = await response.json();
      
      setGradingSystem({
        ...gradingSystem,
        components: gradingSystem.components.map(component => 
          component.id === id 
            ? { ...component, name: data.data.name, weight: data.data.weight } 
            : component
        ),
      });
      
      setEditingComponent(null);
      setStatusMessage({ type: 'success', message: 'Component updated successfully!' });
    } catch (err: any) {
      console.error('Error updating component:', err);
      setStatusMessage({ type: 'error', message: err.message || 'Failed to update component' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a grading component
  const handleDeleteComponent = async (id: string) => {
    if (!gradingSystem) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/grading-components?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete component');
      }
      
      setGradingSystem({
        ...gradingSystem,
        components: gradingSystem.components.filter(component => component.id !== id),
      });
      
      setStatusMessage({ type: 'success', message: 'Component deleted successfully!' });
    } catch (err: any) {
      console.error('Error deleting component:', err);
      setStatusMessage({ type: 'error', message: err.message || 'Failed to delete component' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting the entire grading system
  const handleDeleteGradingSystem = async () => {
    if (!gradingSystem) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this entire grading system? This will remove all components and grades.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/grading-systems?id=${gradingSystem.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete grading system');
      }
      
      // Reset the state
      setGradingSystem(null);
      setStatusMessage({ type: 'success', message: 'Grading system deleted successfully.' });
      
      // Refresh the page to update the UI
      router.refresh();
    } catch (err: any) {
      console.error('Error deleting grading system:', err);
      setStatusMessage({ type: 'error', message: err.message || 'Failed to delete grading system' });
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading state
  if (isLoading && !gradingSystem) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Loading grade information...
        </p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full">
        <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
        <p className="text-red-500 dark:text-red-400 mb-2">{error}</p>
        <button 
          onClick={() => router.refresh()}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Render the create grading system form if no system exists
  if (!gradingSystem) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">Set Up Grade Tracking</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
            Track your grades for this course by setting up a grading system. Define your target grade and add components like assignments, exams, and quizzes with their respective weights.
          </p>
          
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-200 list-disc pl-5 space-y-1">
              <li>Set your target grade for the course</li>
              <li>Add grading components (exams, assignments, etc.)</li>
              <li>Assign weights to each component (must total 100%)</li>
              <li>Track individual grades for each component</li>
              <li>See your current grade and what you need to achieve your target</li>
            </ul>
          </div>
          
          {showGradingSystemForm ? (
            <GradingSystemForm 
              onSubmit={handleCreateGradingSystem}
              onCancel={() => setShowGradingSystemForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowGradingSystemForm(true)}
              className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center justify-center"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Set Up Grade Tracking
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render the grade tracker
  return (
    <div className="flex flex-col w-full">
      {/* Status message */}
      {statusMessage && (
        <div 
          className={`mb-4 p-3 rounded-md flex items-center ${
            statusMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          <span>{statusMessage.message}</span>
          <button 
            onClick={() => setStatusMessage(null)}
            className="ml-auto text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            &times;
          </button>
        </div>
      )}

      {/* Grade summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Grade Summary</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
                  <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setShowGradingSystemForm(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit Target Grade</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                  onClick={handleDeleteGradingSystem}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Grading System</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-300">
              Target Grade: {formatGrade(gradingSystem.target_grade)}%
            </p>
          </div>
          
          {gradeInfo && (
            <div className="mt-4 md:mt-0 text-right">
              <div className="text-3xl font-bold dark:text-white">
                {formatGrade(gradeInfo.currentGrade)}%
              </div>
              <div className={`text-sm font-medium ${
                gradeStatus === 'excellent' ? 'text-green-600 dark:text-green-400' :
                gradeStatus === 'good' ? 'text-blue-600 dark:text-blue-400' :
                gradeStatus === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {gradeInfo.isOnTrack ? 'On track' : `${formatGrade(gradeInfo.remainingNeeded)}% more needed`}
              </div>
            </div>
          )}
        </div>
        
        {/* Progress bar */}
        {gradeInfo && (
          <GradeProgressBar 
            currentGrade={gradeInfo.currentGrade}
            targetGrade={gradeInfo.targetGrade}
            status={gradeStatus as GradeStatus}
          />
        )}
        
        {/* Target grade form */}
        {showGradingSystemForm && (
          <div className="mt-6 border-t dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold mb-2 dark:text-white">Update Target Grade</h3>
            <GradingSystemForm 
              initialValue={gradingSystem.target_grade}
              onSubmit={handleUpdateTargetGrade}
              onCancel={() => setShowGradingSystemForm(false)}
              isUpdate
            />
          </div>
        )}
      </div>

      {/* Grading components */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Grading Components</h2>
          <button
            onClick={() => setShowComponentForm(true)}
            className="py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center"
            disabled={remainingWeight <= 0}
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Component
          </button>
        </div>
        
        {/* Weight information */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {remainingWeight > 0 
              ? `Remaining weight to allocate: ${formatGrade(remainingWeight)}%` 
              : 'All weights allocated (100%)'}
          </p>
          
          {gradingSystem.components.length === 0 && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Getting Started:</strong> Add your first grading component by clicking the "Add Component" button above. 
                Examples include: Midterm (25%), Final Exam (40%), Assignments (25%), Participation (10%).
              </p>
            </div>
          )}
        </div>
        
        {/* Component form - always rendered but visibility toggled */}
        {showComponentForm && (
          <div className="mb-6 border p-4 rounded-md bg-gray-50 dark:bg-gray-700/30 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 dark:text-white">
              {editingComponent ? 'Edit Grading Component' : 'Add Grading Component'}
            </h3>
            <GradingComponentForm 
              onSubmit={editingComponent 
                ? (name: string, weight: number) => handleUpdateComponent(editingComponent.id, name, weight)
                : handleCreateComponent
              }
              onCancel={() => {
                setShowComponentForm(false);
                if (editingComponent) setEditingComponent(null);
              }}
              availableWeight={100 - (remainingWeight + (editingComponent?.weight || 0))}
              initialName={editingComponent?.name || ''}
              initialWeight={editingComponent?.weight || 10}
              isUpdate={!!editingComponent}
            />
          </div>
        )}
        
        {/* Component list */}
        <GradingComponentList 
          components={gradingSystem.components}
          onEdit={(component: GradingComponentWithEntries) => {
            setEditingComponent(component);
            setShowComponentForm(true);
          }}
          onDelete={handleDeleteComponent}
          gradingSystemId={gradingSystem.id}
        />
      </div>
    </div>
  );
} 