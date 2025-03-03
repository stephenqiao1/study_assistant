'use client'

import React, { useState, useRef, useEffect as _useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { X, Upload, FileText, AlertCircle, Check, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { MathRenderer, processLatex } from '@/components/ui/latex'
import { processWithAI as _processWithAI } from '@/utils/ai-helpers'

// Define maximum file size to match server-side limit (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Function to provide compression suggestions based on file characteristics
const _suggestCompressionAlternatives = (file: File): string => {
  const _fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const suggestions = [
    `\n\nTry these alternatives:`,
    `- Use an online PDF compressor tool to reduce the file size`,
    `- If the PDF contains many images, try saving it with lower image quality`,
    `- Try extracting specific pages that you need instead of the entire document`
  ];
  
  return suggestions.join('\n');
}

// Import PDFWorker component
import dynamic from 'next/dynamic'

// Dynamically import PDFWorker to avoid SSR issues
const PDFWorker = dynamic(
  () => import('@/components/pdf/PDFWorker'),
  { ssr: false }
)

// Remove the local splitIntoSections function since we'll use the AI version instead
// Start of function to remove
function splitIntoSections(text: string, fileName: string, metadata?: Record<string, unknown>): { title: string, content: string, tags: string[] }[] {
  // Clean up and normalize the text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Normalize excessive line breaks
    .trim();
  
  // Try to identify section headers using improved patterns
  // This regex looks for potential headers: capitalized lines, numbered sections, etc.
  const headerRegex = /\n(?=[A-Z0-9][A-Z0-9 \t.:]{0,50}(?:\n|\r\n))|(?:\n+(?:[0-9]+\.|\([0-9]+\)|\[[0-9]+\]|Chapter|Section|Part) )/g;
  
  // Split by potential headers
  const sections = cleanedText.split(headerRegex);
  
  // Clean up sections and create notes array
  const notes = [];
  
  // Use metadata if available for better sectioning
  const pageCount = (metadata?.numPages as number) || 1;
  const estimatedSectionCount = Math.max(3, Math.min(20, Math.ceil(pageCount / 2)));
  
  // If we couldn't split effectively (only one big section or too many tiny ones)
  if (sections.length === 1 || sections.length > 50) {
    // Try another approach: split by pages or by paragraphs
    if (sections.length === 1) {
      // If we have one large section, try splitting by paragraphs
      const paragraphs = cleanedText.split(/\n\s*\n/);
      
      // Group paragraphs into reasonable chunks based on document size
      const chunkSize = Math.max(3, Math.min(7, Math.ceil(paragraphs.length / estimatedSectionCount)));
      
      for (let i = 0; i < paragraphs.length; i += chunkSize) {
        const chunk = paragraphs.slice(i, i + chunkSize);
        const content = chunk.join('\n\n');
        
        // Try to extract a meaningful title from the first paragraph
        let title = chunk[0].trim().split(/[.!?]/)[0];
        if (title.length > 60 || title.length < 10) {
          title = `${fileName} - Part ${Math.floor(i / chunkSize) + 1}`;
        }
        
        notes.push({
          title: title,
          content: content.replace(/\n/g, '<br>'),
          tags: ['pdf', 'imported']
        });
      }
    } else {
      // If we have too many small sections, merge them into reasonable chunks
      const chunkSize = Math.ceil(sections.length / estimatedSectionCount);
      
      for (let i = 0; i < sections.length; i += chunkSize) {
        const chunk = sections.slice(i, i + chunkSize);
        const content = chunk.join('\n');
        
        // Try to extract a meaningful title from the first chunk
        let title = chunk[0].trim().split(/[.!?]/)[0];
        if (title.length > 60 || title.length < 10) {
          title = `${fileName} - Part ${Math.floor(i / chunkSize) + 1}`;
        }
        
        notes.push({
          title: title,
          content: content.replace(/\n/g, '<br>'),
          tags: ['pdf', 'imported']
        });
      }
    }
  } else {
    // Process each section into a note with improved title extraction
    sections.forEach((section, index) => {
      // Skip empty sections
      if (!section.trim()) return;
      
      // Extract the first line as a potential title
      const lines = section.split('\n');
      let title = lines[0].trim();
      let content = section.trim();
      
      // Improved title extraction logic
      if (title.length > 60) {
        // Try to extract a shorter title from the first sentence
        const firstSentence = title.split(/[.!?]/)[0];
        if (firstSentence.length <= 60 && firstSentence.length >= 3) {
          title = firstSentence.trim();
        } else {
          title = `${fileName} - Section ${index + 1}`;
        }
      } else if (title.length < 3) {
        title = `${fileName} - Section ${index + 1}`;
      } else {
        // Remove the title line from content if we're using it as the title
        content = lines.slice(1).join('\n').trim();
      }
      
      // Enhanced content processing to maintain structure better
      const processedContent = content
        .replace(/\n/g, '<br>')
        .replace(/<br><br>/g, '</p><p>') // Convert double line breaks to paragraphs
        .replace(/([.!?])<br>/g, '$1</p><p>'); // Try to break at sentences too
      
      const finalContent = `<p>${processedContent}</p>`;
      
      notes.push({
        title: title,
        content: finalContent,
        tags: ['pdf', 'imported']
      });
    });
  }
  
  // If we somehow ended up with no notes, create at least one
  if (notes.length === 0) {
    notes.push({
      title: fileName,
      content: `<p>${cleanedText.replace(/\n/g, '<br>')}</p>`,
      tags: ['pdf', 'imported']
    });
  }
  
  return notes;
}
// End of function to remove

interface PdfUploadModalProps {
  isOpen: boolean
  onClose: () => void
  studySessionId: string
  onNotesCreated: (notes?: ExtractedNote[]) => void
}

interface ExtractedNote {
  id?: string    // Make id optional as it will be present in API responses but not in locally created notes
  title: string
  content: string
  tags: string[]
}

export default function PdfUploadModal({ 
  isOpen, 
  onClose, 
  studySessionId,
  onNotesCreated
}: PdfUploadModalProps): React.ReactElement {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [useAI, setUseAI] = useState(true) // Default to using AI
  
  // State for extracted notes
  const [extractedNotes, setExtractedNotes] = useState<ExtractedNote[]>([])
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'processing' | 'success'>('upload')
  
  // State for client-side extraction - always enabled now
  const [clientSideExtractionProgress, setClientSideExtractionProgress] = useState(0)
  const [clientSideExtractionError, setClientSideExtractionError] = useState<string | null>(null)
  const [_clientExtractedText, setClientExtractedText] = useState<string | null>(null)
  const [_pdfMetadata, setPdfMetadata] = useState<Record<string, unknown> | null>(null)
  
  // State for managing note edits
  const [activeNoteIndex, setActiveNoteIndex] = useState(0)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [editedTags, setEditedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  
  // State for success information
  const [successInfo, setSuccessInfo] = useState<{
    count: number,
    timestamp: string,
    enhancedWithAI?: boolean
  } | null>(null)
  
  // Reset state when modal is closed
  const handleClose = () => {
    // Only reset if not in success state, so user can see the success message
    if (currentStep !== 'success') {
      setSelectedFile(null)
      setUploadProgress(0)
      setIsUploading(false)
      setUploadError(null)
      setExtractedNotes([])
      setCurrentStep('upload')
      // Reset client-side extraction state
      setClientSideExtractionProgress(0)
      setClientSideExtractionError(null)
      setClientExtractedText(null)
      setPdfMetadata(null)
    }
    onClose()
  }
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      setUploadError('No file selected')
      return
    }
    
    // Check if file is a PDF
    if (file.type !== 'application/pdf') {
      setSelectedFile(null)
      setUploadError('Please select a valid PDF file')
      return
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null)
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
      return
    }
    
    // File is valid
    setSelectedFile(file)
    setUploadError(null)
  }
  
  // Handle dragging and dropping files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) {
      setSelectedFile(null)
      setUploadError('No file dropped')
      return
    }
    
    // Check if file is a PDF
    if (file.type !== 'application/pdf') {
      setSelectedFile(null)
      setUploadError('Please drop a valid PDF file')
      return
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null)
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
      return
    }
    
    // File is valid
    setSelectedFile(file)
    setUploadError(null)
  }
  
  // Client-side extraction status messages
  const getExtractionStatusMessage = () => {
    if (clientSideExtractionProgress === 0) return 'Preparing to extract text...';
    if (clientSideExtractionProgress < 25) return 'Loading PDF...';
    if (clientSideExtractionProgress < 50) return 'Processing document structure...';
    if (clientSideExtractionProgress < 75) return 'Extracting text from pages...';
    if (clientSideExtractionProgress < 100) return 'Finalizing extraction...';
    return 'Extraction complete!';
  }

  // Update the handleClientSideExtraction function to use the AI processing
  const handleClientSideExtraction = async (result: string | { text: string; metadata?: Record<string, unknown> }) => {
    // Handle both string and object responses for backward compatibility
    let extractedText: string;
    let metadata: Record<string, unknown> | undefined;
    
    if (typeof result === 'string') {
      extractedText = result;
    } else {
      extractedText = result.text;
      metadata = result.metadata;
      if (metadata) {
        setPdfMetadata(metadata);
      }
    }
    
    setClientExtractedText(extractedText);
    setClientSideExtractionProgress(100);

    if (!selectedFile) return;

    setCurrentStep('processing');
    setUploadProgress(50);
    
    const fileName = selectedFile.name.replace(/\.pdf$/i, '');
    
    try {
      // Get module type from study session ID if available
      const moduleType = 'general'; // Default value - this could be dynamically fetched based on studySessionId

      toast({
        title: "AI Processing",
        description: "ChatGPT is analyzing your PDF and creating structured notes...",
        variant: "default"
      });

      // Call the AI to process the text
      const aiProcessedNotes = await fetch('/api/ai/process-pdf', {
            method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: extractedText,
          fileName,
          moduleType,
          studySessionId
        }),
      }).then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      });

      
      // Use the created notes - make sure they have the required fields for RLS
      const notesWithRequiredFields = aiProcessedNotes.notes.map((note: ExtractedNote) => ({
        ...note,
        // Adding these fields here ensures they are available for preview
        // They will be properly set when saving to the database by the bulk-create endpoint
        study_session_id: studySessionId,
        tags: note.tags || ['pdf', 'imported', 'ai-generated']
      }));
      
      setExtractedNotes(notesWithRequiredFields);
      setActiveNoteIndex(0);
      setEditedTitle(notesWithRequiredFields[0].title);
      setEditedContent(notesWithRequiredFields[0].content);
      setEditedTags(notesWithRequiredFields[0].tags || []);
      
      // Move to review step
      setCurrentStep('review');
      setUploadProgress(100);
      setIsUploading(false);
      
      // Show a toast to inform the user
      toast({
        title: "AI Processing Complete",
        description: `Created ${notesWithRequiredFields.length} notes from your PDF using ChatGPT.`,
        variant: "default"
      });
      
    } catch (error) {
      console.error("Error processing with AI:", error);
      
      // Use a fallback approach if AI processing fails
      fallbackToLocalProcessing(extractedText, fileName);
    }
  }

  // Add a fallback function for when AI processing fails
  const fallbackToLocalProcessing = (text: string, fileName: string) => {
    
    // Basic text cleaning
    const cleanedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Simple paragraph-based splitting
    const paragraphs = cleanedText.split(/\n\s*\n/);
    const chunkSize = Math.max(3, Math.min(7, Math.ceil(paragraphs.length / 10)));
    const notes = [];
    
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      const chunk = paragraphs.slice(i, i + chunkSize);
      const content = chunk.join('\n\n');
      
      // Simple title extraction
      let title = chunk[0].trim().split(/[.!?]/)[0];
      if (title.length > 60 || title.length < 10) {
        title = `${fileName} - Part ${Math.floor(i / chunkSize) + 1}`;
      }
      
      notes.push({
        title: title,
        content: content.replace(/\n/g, '<br>'),
        tags: ['pdf', 'imported', 'auto-processed'],
        study_session_id: studySessionId // Add study session ID for RLS
      });
    }
    
    // If we somehow ended up with no notes, create at least one
    if (notes.length === 0) {
      notes.push({
        title: fileName,
        content: cleanedText.replace(/\n/g, '<br>'),
        tags: ['pdf', 'imported', 'auto-processed'],
        study_session_id: studySessionId // Add study session ID for RLS
      });
    }
    
    setExtractedNotes(notes);
    setActiveNoteIndex(0);
    setEditedTitle(notes[0].title);
    setEditedContent(notes[0].content);
    setEditedTags(notes[0].tags || []);
    
    setCurrentStep('review');
          setUploadProgress(100);
    setIsUploading(false);
    
    toast({
      title: "Processing Complete",
      description: `Created ${notes.length} notes from your PDF using basic processing.`,
      variant: "default"
    });
  }

  // Handle client-side extraction error
  const handleClientSideExtractionError = (error: Error) => {
    console.error('Extraction error:', error);
    setClientSideExtractionError(error.message);
    
    // Show error message to user
    toast({
      title: "PDF extraction failed",
      description: `Error: ${error.message}. Please try a different PDF file.`,
      variant: "destructive"
    });
    
    setIsUploading(false);
  }

  // Handle client-side extraction progress
  const handleClientSideExtractionProgress = (progress: number) => {
    setClientSideExtractionProgress(progress);
  }

  // Process PDF with client-extracted text
  const _processWithClientExtractedText = async (text: string, metadata: Record<string, unknown>) => {
    if (!selectedFile) return;
    
    setCurrentStep('processing');
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(30); // Start at 30% since we already did client-side extraction
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('studySessionId', studySessionId);
    formData.append('useAI', useAI.toString());
    formData.append('isClientExtracted', 'true');
    formData.append('extractedText', text);
    formData.append('metadata', JSON.stringify(metadata));
    
    try {
      // Configure progress tracking
      setUploadProgress(50);
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 200);
      
      // Try to send to server for processing
      const response = await fetch('/api/pdf-extract', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      }).catch(error => {
        console.error("Network error when calling API:", error);
        throw new Error(`API connection error: ${error.message}`);
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        console.error(`Server error: ${response.status} ${response.statusText}`);
        
        // If we get a 404, the API route doesn't exist
        if (response.status === 404) {
          throw new Error(`API endpoint not found (404). Using client-side fallback...`);
        }
        
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set upload progress to 100%
      setUploadProgress(100);
      
      // Process the response
      if (data.notes && data.notes.length > 0) {
        // Store the extracted notes for review
        setExtractedNotes(data.notes);
        
        // Set up the first note for editing
        setActiveNoteIndex(0);
        setEditedTitle(data.notes[0].title);
        setEditedContent(data.notes[0].content);
        setEditedTags(data.notes[0].tags || []);
        
        // Move to review step
        setCurrentStep('review');
      } else {
        throw new Error('No notes were extracted from the PDF');
      }
      } catch (error) {
      console.error('Error processing PDF with client-extracted text:', error);
      
      // Client-side fallback if server API is not available
      if (
        error instanceof Error && 
        (error.message.includes('404') || error.message.includes('API endpoint not found'))
      ) {
        
        // Create fallback notes directly from the extracted text
        const fileName = selectedFile.name.replace(/\.pdf$/i, '');
        
        // Use the same smart sectioning logic as the server
        const fallbackNotes = splitIntoSections(text, fileName, {
          numPages: metadata?.pages || Math.ceil(text.length / 2000), // Estimate page count if not provided
          info: metadata || { Title: fileName }
        });
        
        
        // Use the fallback notes
        setExtractedNotes(fallbackNotes);
            setActiveNoteIndex(0);
        setEditedTitle(fallbackNotes[0].title);
        setEditedContent(fallbackNotes[0].content);
        setEditedTags(fallbackNotes[0].tags || []);
        
        // Move to review step
            setCurrentStep('review');
        
        // Show a toast to inform the user
        toast({
          title: "Using client-side processing",
          description: `Created ${fallbackNotes.length} notes from your PDF. You can now review them.`,
          variant: "default"
        });
        } else {
        setUploadError(error instanceof Error ? error.message : 'Failed to process PDF');
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  // Process with server-side extraction only
  const _processWithServerExtraction = async () => {
    if (!selectedFile) return;
    
    setCurrentStep('processing');
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('studySessionId', studySessionId);
    formData.append('useAI', useAI.toString());
    
    try {
      // Configure progress tracking
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Send to server for processing
      const response = await fetch('/api/pdf-extract', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set upload progress to 100%
      setUploadProgress(100);
      
      // Process the response
      if (data.notes && data.notes.length > 0) {
        // Store the extracted notes for review
        setExtractedNotes(data.notes);
        
        // Set up the first note for editing
        setActiveNoteIndex(0);
        setEditedTitle(data.notes[0].title);
        setEditedContent(data.notes[0].content);
        setEditedTags(data.notes[0].tags || []);
        
        // Move to review step
        setCurrentStep('review');
      } else {
        throw new Error('No notes were extracted from the PDF');
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to process PDF');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Process the PDF file (updated to use client-side extraction)
  const handleProcessPdf = async () => {
    if (!selectedFile) return;
    
    // Always use client-side extraction now
    setCurrentStep('processing');
    setUploadError(null);
    setClientSideExtractionProgress(0);
    setClientSideExtractionError(null);
    setClientExtractedText(null);
    setPdfMetadata(null);
    
    // Let the PDFWorker component handle the extraction
    // It will call handleClientSideExtraction when complete
    // or handleClientSideExtractionError if there's an error
  };
  
  // Handle saving notes to the database
  const handleSaveNotes = async () => {
    if (extractedNotes.length === 0 || !studySessionId) return
    
    // Update the current note being edited
    const updatedNotes = [...extractedNotes]
    updatedNotes[activeNoteIndex] = {
      ...updatedNotes[activeNoteIndex],
      title: editedTitle,
      content: editedContent,
      tags: editedTags,
    }
    
    try {
      setIsUploading(true)
      
      const response = await fetch('/api/notes/bulk-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          studySessionId,
          notes: updatedNotes,
        }),
      })
      
      
      // Handle auth errors specifically
      if (response.status === 401) {
        // Session expired or user not authenticated
        toast({
          title: 'Authentication Error',
          description: 'Your session has expired. Please refresh the page and try again.',
          variant: 'destructive',
        });
        
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        
        throw new Error('Authentication failed - session expired');
      }
      
      // Parse response data first - can only do this once
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error("❌ PdfUploadModal: Error response from API:", responseData);
        
        // Check for specific database schema errors
        if (responseData.error && (
            responseData.error.includes('column not found') || 
            responseData.error.includes('Could not find') || 
            responseData.error.code === 'PGRST204'
           )) {
          toast({
            title: 'Database Schema Error',
            description: 'There appears to be a mismatch between the note format and the database schema. Please contact support.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Failed to save notes',
            description: responseData.error || 'An unexpected error occurred while saving notes',
            variant: 'destructive',
          });
        }
        
        throw new Error(responseData.error || 'Failed to save notes')
      }
      
      
      // Set success info for the success screen
      setSuccessInfo({
        count: updatedNotes.length,
        timestamp: new Date().toLocaleString(),
        enhancedWithAI: useAI
      })
      
      // Change to success state
      setCurrentStep('success')
      
      toast({
        title: 'Notes created successfully',
        description: `${updatedNotes.length} notes have been added to your module.`,
      })
      
      // Notify parent component that notes were created - PASS THE CREATED NOTES
      // Use the notes array returned from the API if available, otherwise use our local copy
      const createdNotes = responseData.notes || updatedNotes;
      onNotesCreated(createdNotes);
      
    } catch (error) {
      console.error('❌ PdfUploadModal: Error saving notes:', error)
      toast({
        title: 'Failed to save notes',
        description: error instanceof Error ? error.message : 'An error occurred while saving notes',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }
  
  // Handle starting a new import after success
  const handleNewImport = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    setIsUploading(false)
    setUploadError(null)
    setExtractedNotes([])
    setSuccessInfo(null)
    setCurrentStep('upload')
  }
  
  // Handle adding a new tag
  const handleAddTag = () => {
    if (newTag.trim() && !editedTags.includes(newTag.trim())) {
      setEditedTags([...editedTags, newTag.trim()])
      setNewTag('')
    }
  }
  
  // Handle removing a tag
  const handleRemoveTag = (tag: string) => {
    setEditedTags(editedTags.filter(t => t !== tag))
  }
  
  // Handle changing the active note
  const handleChangeNote = (index: number) => {
    // Save current edits
    const updatedNotes = [...extractedNotes]
    updatedNotes[activeNoteIndex] = {
      ...updatedNotes[activeNoteIndex],
      title: editedTitle,
      content: editedContent,
      tags: editedTags,
    }
    setExtractedNotes(updatedNotes)
    
    // Set new active note
    setActiveNoteIndex(index)
    setEditedTitle(updatedNotes[index].title)
    setEditedContent(updatedNotes[index].content)
    setEditedTags(updatedNotes[index].tags || [])
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={isOpen => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Notes from PDF</DialogTitle>
          <DialogDescription>
            Upload a PDF document to extract content and create notes.
          </DialogDescription>
        </DialogHeader>
        
        {currentStep === 'upload' && (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf" 
                className="hidden" 
              />
              <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-1">Upload PDF</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop a PDF file here, or click to browse
              </p>
              {selectedFile && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="use-ai"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="use-ai" className="text-sm font-medium">
                Use ChatGPT to intelligently organize and enhance notes (Recommended)
              </label>
            </div>
            
            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
            
            <div className="text-sm text-muted-foreground">
              <h4 className="font-medium mb-1">Notes:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>PDF files will be processed to extract text content</li>
                <li>Maximum file size is 10MB</li>
                <li>The content will be organized into individual notes</li>
                <li>Each section or chapter may be converted to a separate note</li>
                <li>You'll be able to review and edit the notes before saving</li>
              </ul>
            </div>
          </div>
        )}
        
        {currentStep === 'processing' && (
          <div className="space-y-6 p-4">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Processing PDF</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {clientSideExtractionProgress < 100 
                  ? getExtractionStatusMessage()
                  : "ChatGPT is analyzing your document and creating structured notes..."}
              </p>
              
              {/* Client-side extraction progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Extracting text</span>
                  <span>{Math.round(clientSideExtractionProgress)}%</span>
                </div>
                <Progress value={clientSideExtractionProgress} className="h-2" />
              </div>
              
              {/* AI processing progress - shown after text extraction */}
              {clientSideExtractionProgress === 100 && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>ChatGPT processing</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-3">
                {clientSideExtractionProgress === 100
                  ? "Text extraction complete. ChatGPT is analyzing and creating notes..."
                  : clientSideExtractionProgress > 0
                  ? "Extracting text from your PDF..."
                  : "Starting extraction process..."}
              </p>
            </div>
            
            {/* Error messages */}
            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Processing Error</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
            )}
            
            {clientSideExtractionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Extraction Error</AlertTitle>
                <AlertDescription>
                  {clientSideExtractionError}
                  <p className="text-sm mt-1">Please try a different PDF file.</p>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Hidden component that handles PDF extraction */}
            {selectedFile && (
              <div style={{ display: 'none' }}>
                <PDFWorker
                  file={selectedFile}
                  onExtracted={handleClientSideExtraction}
                  onProgress={handleClientSideExtractionProgress}
                  onError={handleClientSideExtractionError}
                />
                </div>
              )}
          </div>
        )}
        
        {currentStep === 'review' && extractedNotes.length > 0 && (
          <div className="space-y-4">
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">Edit Note</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="space-y-4 py-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3">
                    <Label htmlFor="note-title">Title</Label>
                    <Input 
                      id="note-title" 
                      value={editedTitle}
                      onChange={e => setEditedTitle(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="col-span-3">
                    <Label htmlFor="note-content">Content</Label>
                    <Textarea
                      id="note-content"
                      value={editedContent}
                      onChange={e => setEditedContent(e.target.value)}
                      className="mt-1 min-h-[200px]"
                    />
                  </div>
                  
                  <div className="col-span-3">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-1 mb-2">
                      {editedTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1 items-center dark:bg-slate-700 dark:text-slate-200">
                          {tag}
                          <button 
                            onClick={() => handleRemoveTag(tag)}
                            className="text-muted-foreground hover:text-foreground ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleAddTag}
                        disabled={!newTag.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preview">
                <div className="border rounded-md p-4 min-h-[350px] prose dark:prose-invert max-w-none">
                  <h2>{editedTitle}</h2>
                  <MathRenderer htmlContent={processLatex(editedContent)} />
                  
                  {editedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-4 not-prose">
                      {editedTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="dark:bg-slate-700 dark:text-slate-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            {extractedNotes.length > 1 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Notes ({extractedNotes.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {extractedNotes.map((note, index) => (
                    <Button
                      key={index}
                      variant={index === activeNoteIndex ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleChangeNote(index)}
                    >
                      {index + 1}. {note.title.slice(0, 15)}{note.title.length > 15 ? '...' : ''}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {currentStep === 'success' && successInfo && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="text-xl font-medium">Import Successful!</h3>
              <p className="text-center text-muted-foreground">
                {successInfo.count} notes have been successfully imported and saved to your module.
              </p>
              
              <div className="w-full max-w-md bg-muted p-4 rounded-md">
                <p className="text-sm"><strong>Notes added:</strong> {successInfo.count}</p>
                <p className="text-sm"><strong>Time:</strong> {successInfo.timestamp}</p>
                <p className="text-sm"><strong>File:</strong> {selectedFile?.name}</p>
                {successInfo.enhancedWithAI && (
                  <p className="text-sm"><strong>Enhancement:</strong> <span className="text-green-600 dark:text-green-400 font-medium">AI-enhanced notes</span></p>
                )}
              </div>
              
              {extractedNotes.length > 0 && (
                <div className="w-full max-w-md">
                  <h4 className="font-medium mb-2">Notes Preview:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {extractedNotes.slice(0, 3).map((note, index) => (
                      <div key={index} className="text-sm bg-background p-2 rounded border border-border">
                        <p className="font-medium">{note.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{note.content}</p>
                      </div>
                    ))}
                    {extractedNotes.length > 3 && (
                      <p className="text-xs text-center text-muted-foreground">
                        +{extractedNotes.length - 3} more notes saved
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: These notes will appear in your module list shortly.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <DialogFooter>
          {currentStep === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleProcessPdf} 
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Process PDF</>
                )}
              </Button>
            </>
          )}
          
          {currentStep === 'processing' && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          
          {currentStep === 'review' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleSaveNotes} 
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save Notes</>
                )}
              </Button>
            </>
          )}
          
          {currentStep === 'success' && (
            <>
              <Button variant="outline" onClick={handleClose}>Close</Button>
              <Button onClick={handleNewImport}>Import Another PDF</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
