'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { isPremiumUser } from '@/utils/subscription-helpers';

interface ImportDocumentsProps {
  userId: string;
}

export default function ImportDocuments({ userId }: ImportDocumentsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    try {
      setIsLoading(true);
      
      // Check subscription status first
      const hasAccess = await isPremiumUser(userId);
      
      if (!hasAccess) {
        toast({
          title: "Premium Feature",
          description: "Document import is only available for Basic and Pro tier subscribers. Please upgrade your plan to use this feature.",
          variant: "destructive",
        });
        return;
      }
      
      // Create form data
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('documents', file);
      });
      
      // Send request to import endpoint
      const response = await fetch('/api/import-documents', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          toast({
            title: "Premium Feature",
            description: data.message || "This feature requires a premium subscription",
            variant: "destructive",
          });
        } else {
          throw new Error(data.error || 'Failed to import documents');
        }
        return;
      }
      
      toast({
        title: "Success",
        description: "Documents imported successfully!",
      });
      
      // Refresh the page to show new documents
      router.refresh();
    } catch (error) {
      console.error('Error importing documents:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast, router]);

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-gray-300 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-colors">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => handleImport(e.target.files)}
        disabled={isLoading}
      />
      <label
        htmlFor="file-upload"
        className="cursor-pointer flex flex-col items-center"
      >
        <Upload className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
        <div className="text-center">
          <p className="text-sm font-medium mb-1">
            {isLoading ? 'Importing...' : 'Import Documents'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PDF, Word, or Text files
          </p>
        </div>
      </label>
      
      {/* Premium feature notice */}
      <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center">
        <AlertCircle className="w-4 h-4 mr-1" />
        Basic or Pro subscription required
      </div>
    </div>
  );
} 