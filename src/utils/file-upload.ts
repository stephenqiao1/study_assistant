import { v4 as uuidv4 } from 'uuid';

/**
 * Default chunk size for file uploads (1MB)
 */
const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB

/**
 * Interface for upload progress updates
 */
export interface UploadProgressInfo {
  fileName: string;
  uploadedChunks: number;
  totalChunks: number;
  uploadedBytes: number;
  totalBytes: number;
  percentComplete: number;
}

/**
 * Interface for upload result
 */
export interface UploadResult {
  success: boolean;
  uploadId: string;
  fileName: string;
  fileSize: number;
  error?: string;
  tempFilePath?: string;
}

/**
 * Interface for upload options
 */
export interface UploadOptions {
  file: File;
  studySessionId: string;
  useAI: boolean;
  chunkSize?: number;
  onProgress?: (progress: UploadProgressInfo) => void;
  signal?: AbortSignal;
}

/**
 * Upload a file in chunks to the server
 */
export async function uploadLargeFile(options: UploadOptions): Promise<UploadResult> {
  const { 
    file, 
    studySessionId, 
    useAI, 
    chunkSize = DEFAULT_CHUNK_SIZE,
    onProgress,
    signal
  } = options;
  
  // Generate a unique ID for this upload
  const uploadId = uuidv4();
  
  // Calculate total chunks needed
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedBytes = 0;
  
  try {
    // Upload each chunk
    for (let i = 0; i < totalChunks; i++) {
      // Check if upload was aborted
      if (signal?.aborted) {
        throw new Error('Upload aborted');
      }
      
      // Create chunk
      const start = i * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      
      // Prepare form data for this chunk
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('fileName', file.name);
      formData.append('chunkIndex', i.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('fileSize', file.size.toString());
      formData.append('studySessionId', studySessionId);
      formData.append('fileType', file.type);
      formData.append('useAI', useAI.toString());
      formData.append('uploadId', uploadId);
      
      // Upload this chunk
      const response = await fetch('/api/pdf/chunk-upload', {
        method: 'POST',
        body: formData,
        signal
      });
      
      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      // Update progress
      uploadedBytes += chunk.size;
      if (onProgress) {
        onProgress({
          fileName: file.name,
          uploadedChunks: i + 1,
          totalChunks,
          uploadedBytes,
          totalBytes: file.size,
          percentComplete: Math.round((uploadedBytes / file.size) * 100)
        });
      }
      
      // If this was the last chunk, process the file
      if (i === totalChunks - 1) {
        const completeData = await response.json();
        
        if (completeData.complete) {
          // Trigger processing on the server
          const processResponse = await fetch('/api/pdf/chunk-upload', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uploadId }),
            signal
          });
          
          if (!processResponse.ok) {
            throw new Error('Failed to initiate processing');
          }
          
          const _processResult = await processResponse.json();
          
          return {
            success: true,
            uploadId,
            fileName: file.name,
            fileSize: file.size,
            tempFilePath: completeData.tempFilePath
          };
        }
      }
    }
    
    // Should not reach here unless there's an error
    throw new Error('Upload incomplete');
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
} 