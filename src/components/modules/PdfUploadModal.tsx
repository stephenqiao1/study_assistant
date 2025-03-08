'use client'

import React, { useState, useRef } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Upload, FileText, X, Plus, Loader2, Check, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Define maximum file size to match server-side limit (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
  const [useAI, _setUseAI] = useState(true) // Default to using AI
  
  // State for extracted notes
  const [extractedNotes, setExtractedNotes] = useState<ExtractedNote[]>([])
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'processing' | 'success'>('upload')
  
  // State for client-side extraction - always enabled now
  const [clientSideExtractionProgress, setClientSideExtractionProgress] = useState(0)
  const [_clientSideExtractionError, setClientSideExtractionError] = useState<string | null>(null)
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
    
    // Check file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
    const validOfficeTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
      'application/vnd.ms-powerpoint' // PPT
    ];
    const isPdf = file.type === 'application/pdf';
    const isImage = validImageTypes.includes(file.type);
    const isPowerPoint = validOfficeTypes.includes(file.type);
    
    if (!isPdf && !isImage && !isPowerPoint) {
      setSelectedFile(null);
      setUploadError('Please select a valid PDF, PowerPoint presentation, or image file (JPEG, PNG, GIF, BMP, TIFF)');
      return;
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
    
    // Check file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
    const validOfficeTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
      'application/vnd.ms-powerpoint' // PPT
    ];
    const isPdf = file.type === 'application/pdf';
    const isImage = validImageTypes.includes(file.type);
    const isPowerPoint = validOfficeTypes.includes(file.type);
    
    if (!isPdf && !isImage && !isPowerPoint) {
      setSelectedFile(null);
      setUploadError('Please drop a valid PDF, PowerPoint presentation, or image file (JPEG, PNG, GIF, BMP, TIFF)');
      return;
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
  const _getExtractionStatusMessage = () => {
    if (clientSideExtractionProgress === 0) return 'Preparing to extract text...';
    if (clientSideExtractionProgress < 25) return 'Loading PDF...';
    if (clientSideExtractionProgress < 50) return 'Processing document structure...';
    if (clientSideExtractionProgress < 75) return 'Extracting text from pages...';
    if (clientSideExtractionProgress < 100) return 'Finalizing extraction...';
    return 'Extraction complete!';
  }

  // Update the handleClientSideExtraction function to use the AI processing
  const _handleClientSideExtraction = async (_result: string | { text: string; metadata?: Record<string, unknown> }) => {
    console.warn('handleClientSideExtraction is deprecated - using direct server-side processing instead');
  }

  const _handleClientSideExtractionError = (_error: Error) => {
    console.warn('handleClientSideExtractionError is deprecated - using direct server-side processing instead');
  }

  const _handleClientSideExtractionProgress = (_progress: number) => {
    console.warn('handleClientSideExtractionProgress is deprecated - using direct server-side processing instead');
  }

  // Add a fallback function for when AI processing fails
  const _fallbackToLocalProcessing = (_text: string, _fileName: string) => {
    console.warn('fallbackToLocalProcessing is deprecated - using direct server-side processing instead');
  }

  // Process PDF with client-extracted text
  const _processWithClientExtractedText = async (_text: string, _metadata: Record<string, unknown>) => {
    console.warn('_processWithClientExtractedText is deprecated - using direct server-side processing instead');
  }
  
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
  
  // Process the PDF file (updated to use Azure Document Intelligence)
  const handleProcessPdf = async () => {
    if (!selectedFile) return;
    
    // Set up processing state
    setCurrentStep('processing');
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(10);
    
    // Create form data for the file upload
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('studySessionId', studySessionId);
    formData.append('useAI', 'false'); // We're using Azure Document Intelligence, not OpenAI
    formData.append('useOpenAI', 'true'); // Always use OpenAI for clean notes
    
    try {
      // Configure progress tracking
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 200);
      
      // Upload directly to the server for Azure Document Intelligence processing
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
          throw new Error(`API endpoint not found (404).`);
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
        
        // Show success toast
        toast({
          title: "Document Processing Complete",
          description: `Created ${data.notes.length} notes from your document using Azure Document Intelligence.`,
          variant: "default"
        });
      } else {
        throw new Error('No notes were extracted from the document');
      }
    } catch (error) {
      console.error('Error processing document:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to process document');
    } finally {
      setIsUploading(false);
    }
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
        console.error('❌ PdfUploadModal: Error response from API:', responseData);
        
        // Check if error is related to subscription
        if (responseData.error && responseData.error.includes('subscription')) {
          toast({
            title: "Subscription Required",
            description: "PDF import requires a Basic or Pro subscription.",
            variant: "destructive"
          });
          onClose();
          return;
        }
        
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
          <DialogTitle>Import Notes from Document</DialogTitle>
          <DialogDescription>
            Upload a PDF, PowerPoint, or image file to extract content and create notes.
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
                accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.tiff" 
                className="hidden" 
              />
              <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-1">Upload Document</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop a PDF, PowerPoint, or image file here, or click to browse
              </p>
              {selectedFile && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                </div>
              )}
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
                <li>PDF, PowerPoint, and image files will be processed to extract text content</li>
                <li>Maximum file size is 10MB</li>
                <li>The content will be organized into individual notes</li>
                <li>Each section or chapter may be converted to a separate note</li>
                <li>You'll be able to review and edit the notes before saving</li>
              </ul>
            </div>
          </div>
        )}
        
        {currentStep === 'processing' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-medium mb-1">Processing Document</h3>
                <p className="text-sm text-muted-foreground">
                  Your document is being processed with Azure Document Intelligence...
                </p>
                <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{Math.round(uploadProgress)}%</span>
                </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
              </div>
                  </div>
              </div>
            </div>
          </div>
        )}
        
        {currentStep === 'review' && extractedNotes.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Edit Note</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="note-title" className="block text-sm font-medium mb-1">Title</label>
                    <Input 
                      id="note-title" 
                      value={editedTitle}
                      onChange={e => setEditedTitle(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="note-content" className="block text-sm font-medium mb-1">Content</label>
                    <Textarea
                      id="note-content"
                      value={editedContent}
                      onChange={e => setEditedContent(e.target.value)}
                      className="min-h-[200px]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editedTags.map(tag => (
                        <Badge key={tag} variant="default" className="flex items-center gap-1">
                          {tag}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveTag(tag)}
                            className="text-xs"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <div className="flex items-center gap-1">
                      <Input
                          placeholder="Add tag..." 
                          className="w-24 h-7 text-xs"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                      />
                      <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0" 
                        onClick={handleAddTag}
                      >
                          <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                    </div>
                </div>
            
            {extractedNotes.length > 1 && (
              <div>
                  <h4 className="text-sm font-medium mb-2">All Notes ({extractedNotes.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {extractedNotes.map((note, index) => (
                    <Button
                      key={index}
                      variant={index === activeNoteIndex ? "default" : "outline"}
                        className="justify-start overflow-hidden h-auto py-2"
                      onClick={() => handleChangeNote(index)}
                    >
                        <div className="truncate text-left">
                          <span className="font-medium">{note.title}</span>
                        </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            </div>
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
                  <>
                    Process Document
                  </>
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
