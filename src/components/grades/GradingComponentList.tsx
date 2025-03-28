'use client';

import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { GradeEntry, GradingComponentWithEntries } from '@/types/grading';
import { formatGrade } from '@/utils/gradeCalculations';
import GradeEntryForm from './GradeEntryForm';
import { AlertCircle } from 'lucide-react';

interface GradingComponentListProps {
  components: GradingComponentWithEntries[];
  onEdit: (component: GradingComponentWithEntries) => void;
  onDelete: (componentId: string) => void;
  _gradingSystemId: string;
}

export default function GradingComponentList({
  components,
  onEdit,
  onDelete,
  _gradingSystemId
}: GradingComponentListProps) {
  const [expandedComponents, setExpandedComponents] = useState<Record<string, boolean>>({});
  const [showEntryForm, setShowEntryForm] = useState<Record<string, boolean>>({});
  const [editingEntry, setEditingEntry] = useState<GradeEntry | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newGrade, setNewGrade] = useState({ score: '', maxScore: '' });
  const { toast } = useToast();
  
  const handleError = (error: Error | unknown) => {
    console.error('Error:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "An unexpected error occurred",
      variant: "destructive",
    });
  };

  // Toggle component expansion
  const toggleExpand = (componentId: string) => {
    setExpandedComponents(prev => ({
      ...prev,
      [componentId]: !prev[componentId]
    }));
  };
  
  // Toggle entry form visibility
  const toggleEntryForm = (componentId: string) => {
    setShowEntryForm(prev => ({
      ...prev,
      [componentId]: !prev[componentId]
    }));
    
    // Reset editing entry when toggling form
    setEditingEntry(null);
  };
  
  // Handle creating a new grade entry
  const handleCreateEntry = async (componentId: string, name: string, score: number, maxScore: number, date: string) => {
    try {
      const response = await fetch('/api/grade-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grading_component_id: componentId,
          name,
          score,
          max_score: maxScore,
          date,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create grade entry');
      }
      
      const { data: _data } = await response.json();
      
      // Update the local state with the new entry
      const _updatedComponents = components.map(component => {
        if (component.id === componentId) {
          return {
            ...component,
            entries: [...component.entries, _data],
          };
        }
        return component;
      });
      
      // Close the entry form
      setShowEntryForm(prev => ({
        ...prev,
        [componentId]: false,
      }));
      
      setStatusMessage({ type: 'success', message: 'Grade entry added successfully!' });
      
      // Expand the component to show the new entry
      setExpandedComponents(prev => ({
        ...prev,
        [componentId]: true,
      }));
    } catch (error) {
      console.error('Error creating grade entry:', error);
      setStatusMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create grade entry' 
      });
    }
  };
  
  // Handle updating a grade entry
  const handleUpdateEntry = async (entryId: string, name: string, score: number, maxScore: number, date: string) => {
    try {
      const response = await fetch('/api/grade-entries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: entryId,
          name,
          score,
          max_score: maxScore,
          date,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update grade entry');
      }
      
      const { data: _data } = await response.json();
      
      // Update the local state with the updated entry
      const _updatedComponents = components.map(component => {
        if (component.id === editingEntry?.component_id) {
          return {
            ...component,
            entries: component.entries.map(entry =>
              entry.id === editingEntry.id ? editingEntry : entry
            )
          };
        }
        return component;
      });
      
      // Close the entry form and reset editing entry
      setShowEntryForm(prev => ({
        ...prev,
        [editingEntry?.component_id || '']: false,
      }));
      setEditingEntry(null);
      
      setStatusMessage({ type: 'success', message: 'Grade entry updated successfully!' });
    } catch (error) {
      console.error('Error updating grade entry:', error);
      setStatusMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to update grade entry' 
      });
    }
  };
  
  // Handle deleting a grade entry
  const handleDeleteEntry = async (entryId: string, componentId: string) => {
    if (!confirm('Are you sure you want to delete this grade entry?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/grade-entries?id=${entryId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete grade entry');
      }
      
      // Update the local state by removing the deleted entry
      const _updatedComponents = components.map(component => {
        if (component.id === componentId) {
          return {
            ...component,
            entries: component.entries.filter(entry => entry.id !== entryId),
          };
        }
        return component;
      });
      
      setStatusMessage({ type: 'success', message: 'Grade entry deleted successfully!' });
    } catch (error) {
      console.error('Error deleting grade entry:', error);
      setStatusMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete grade entry' 
      });
    }
  };
  
  // Handle editing a grade entry
  const handleEditEntry = (entry: GradeEntry) => {
    setEditingEntry(entry);
    setShowEntryForm(prev => ({
      ...prev,
      [entry.component_id]: true,
    }));
  };
  
  const _handleAddGrade = async (componentId: string) => {
    if (!newGrade.score || !newGrade.maxScore) return;
    
    try {
      const response = await fetch('/api/grade-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component_id: componentId,
          score: parseFloat(newGrade.score),
          max_score: parseFloat(newGrade.maxScore),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add grade');
      }
      
      const { data: _data } = await response.json();
      const _updatedComponents = components.map(component => {
        if (component.id === componentId) {
          return {
            ...component,
            entries: [...component.entries, _data.data],
          };
        }
        return component;
      });
      
      setNewGrade({ score: '', maxScore: '' });
      toast({
        title: "Success",
        description: "Grade added successfully!",
      });
    } catch (error) {
      handleError(error);
    }
  };
  
  const _handleDeleteGrade = async (componentId: string, gradeId: string) => {
    try {
      const response = await fetch(`/api/grade-entries/${gradeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete grade');
      }
      
      const _updatedComponents = components.map(component => {
        if (component.id === componentId) {
          return {
            ...component,
            entries: component.entries.filter((entry: GradeEntry) => entry.id !== gradeId),
          };
        }
        return component;
      });
      
      toast({
        title: "Success",
        description: "Grade deleted successfully!",
      });
    } catch (error) {
      handleError(error);
    }
  };
  
  const calculateComponentScore = (component: GradingComponentWithEntries, entries: GradeEntry[]): number => {
    if (!entries.length) return 0;
    
    // Calculate total score without weights
    const totalScore = entries.reduce((sum, entry) => {
      const score = entry.score || 0;
      const maxScore = entry.max_score || 1;
      return sum + (score / maxScore) * 100;
    }, 0);
    
    // Return average score
    return totalScore / entries.length;
  };
  
  // If there are no components, show a message
  if (components.length === 0) {
    return (
      <div className="text-center py-8 border dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
        <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No grading components</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add components like exams, assignments, and quizzes to track your grades.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Status message */}
      {statusMessage && (
        <div 
          className={`p-3 rounded-md flex items-center ${
            statusMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}
        >
          <span>{statusMessage.message}</span>
          <button 
            onClick={() => setStatusMessage(null)}
            className="ml-auto text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            &times;
          </button>
        </div>
      )}
      
      {/* Component list */}
      <div className="space-y-4">
        {components.map(component => {
          const isExpanded = expandedComponents[component.id] || false;
          const showForm = showEntryForm[component.id] || false;
          const score = calculateComponentScore(component, component.entries);
          const hasEntries = component.entries.length > 0;
          
          return (
            <div key={component.id} className="border dark:border-gray-700 rounded-md overflow-hidden">
              {/* Component header */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{component.name}</h3>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({component.weight}%)</span>
                  </div>
                  
                  {hasEntries && (
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Current Score: <span className="font-medium">{formatGrade(score)}%</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEdit(component)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Edit component"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => onDelete(component.id)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    title="Delete component"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  {hasEntries && (
                    <button
                      onClick={() => toggleExpand(component.id)}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Entry form */}
              {showForm && (
                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {editingEntry ? 'Edit Grade Entry' : 'Add Grade Entry'}
                  </h4>
                  <GradeEntryForm
                    onSubmit={
                      editingEntry
                        ? (name: string, score: number, maxScore: number, date: string) => 
                            handleUpdateEntry(editingEntry.id, name, score, maxScore, date)
                        : (name: string, score: number, maxScore: number, date: string) => 
                            handleCreateEntry(component.id, name, score, maxScore, date)
                    }
                    onCancel={() => {
                      toggleEntryForm(component.id);
                      setEditingEntry(null);
                    }}
                    initialName={editingEntry?.name}
                    initialScore={editingEntry?.score}
                    initialMaxScore={editingEntry?.max_score}
                    initialDate={editingEntry?.date}
                    isUpdate={!!editingEntry}
                  />
                </div>
              )}
              
              {/* Entries list */}
              {hasEntries && isExpanded && (
                <div className="p-4 border-t dark:border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Score
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {component.entries.map(entry => (
                          <tr key={entry.id}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {entry.name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {entry.score} / {entry.max_score} ({formatGrade((entry.score / entry.max_score) * 100)}%)
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(entry.date).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditEntry(entry)}
                                className="text-primary hover:text-primary-dark dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id, component.id)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Add entry button */}
              <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <button
                  onClick={() => toggleEntryForm(component.id)}
                  className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-800"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {showForm ? 'Cancel' : 'Add Grade Entry'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 