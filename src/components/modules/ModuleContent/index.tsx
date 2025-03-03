'use client'

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Edit2, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DraftEditor from "@/components/teach/DraftEditor";

interface Module {
  id: string;
  module_title: string;
  details?: {
    title?: string;
    content?: string;
    description?: string;
  };
}

interface ModuleContentProps {
  module: Module;
  activeSection: string;
  onClose: () => void;
}

export default function ModuleContent({ module, activeSection, onClose }: ModuleContentProps) {
  const supabase = createClient();
  const { toast } = useToast();
  
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [editedModuleContent, setEditedModuleContent] = useState(module.details?.content || '');
  const [isUpdatingModule, setIsUpdatingModule] = useState(false);
  
  // Handle updating module content
  const handleUpdateModuleContent = async () => {
    if (!module.id) return;
    
    setIsUpdatingModule(true);
    try {
      // Create updated details object
      const updatedDetails = {
        ...(module.details || {}),
        content: editedModuleContent
      };
      
      const { error } = await supabase
        .from('modules')
        .update({
          details: updatedDetails
        })
        .eq('id', module.id);
        
      if (error) throw error;
      
      setIsEditingModule(false);
      
      toast({
        title: "Module updated",
        description: "Module description has been updated successfully."
      });
    } catch (error) {
      console.error("Error updating module:", error);
      toast({
        title: "Error",
        description: "Failed to update module. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingModule(false);
    }
  };
  
  if (activeSection !== 'module') {
    return null;
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Module Description</h1>
        <div className="flex space-x-2">
          {!isEditingModule && (
            <Button 
              variant="outline" 
              onClick={() => {
                setEditedModuleContent(module.details?.content || '');
                setIsEditingModule(true);
              }}
            >
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => {
              if (isEditingModule) {
                setIsEditingModule(false);
              } else {
                onClose();
              }
            }}
          >
            <X className="h-4 w-4 mr-1" /> {isEditingModule ? 'Cancel' : 'Close'}
          </Button>
        </div>
      </div>
      
      {isEditingModule ? (
        <div className="space-y-4">
          <DraftEditor
            initialContent={editedModuleContent}
            onChange={setEditedModuleContent}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleUpdateModuleContent}
              disabled={isUpdatingModule}
            >
              {isUpdatingModule ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Description
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose dark:prose-invert max-w-none">
          {module.details && module.details.content ? (
            <div dangerouslySetInnerHTML={{ __html: module.details.content }} />
          ) : (
            <p className="text-gray-500 dark:text-gray-400">This module has no description yet. Click Edit to add one.</p>
          )}
        </div>
      )}
    </div>
  );
} 