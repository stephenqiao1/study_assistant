import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createClient } from '@/utils/supabase/server';

// Configuration for this API route
export const config = {
  api: {
    bodyParser: false,
  },
};

// Interface for chunk data tracking
interface ChunkData {
  fileName: string;
  studySessionId: string;
  useAI: boolean;
  totalChunks: number;
  currentChunk: number;
  chunkSize: number;
  totalSize: number;
  tempFilePath: string;
  fileType: string;
}

// In-memory cache for tracking chunk uploads
// Warning: This will be cleared when the server restarts
const chunkCache = new Map<string, ChunkData>();

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request using the correct approach for Next.js 15
    const supabase = await createClient();

    // Get the current user
    const { data, error: _userError } = await supabase.auth.getUser();
    const user = data.user;

    if (!user?.id && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }

    // Get form data with chunk information
    const formData = await request.formData();
    const chunkBlob = formData.get('chunk') as Blob;
    const fileName = formData.get('fileName') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileSize = parseInt(formData.get('fileSize') as string);
    const studySessionId = formData.get('studySessionId') as string;
    const fileType = formData.get('fileType') as string;
    const useAI = formData.get('useAI') === 'true';
    const uploadId = formData.get('uploadId') as string;

    if (!chunkBlob || !fileName || isNaN(chunkIndex) || isNaN(totalChunks) || !uploadId || !studySessionId) {
      return NextResponse.json(
        { error: 'Missing required chunk upload parameters' },
        { status: 400 }
      );
    }

    // Check file type
    if (fileType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Create a temporary file path 
    const tempDir = os.tmpdir();
    let tempFilePath: string;

    // If this is the first chunk, initialize the chunk tracking
    if (chunkIndex === 0) {
      tempFilePath = path.join(tempDir, `${uploadId}_${fileName}`);
      chunkCache.set(uploadId, {
        fileName,
        studySessionId,
        useAI,
        totalChunks,
        currentChunk: 0,
        chunkSize: chunkBlob.size,
        totalSize: fileSize,
        tempFilePath,
        fileType,
      });
    } else {
      // For subsequent chunks, get the existing data
      const chunkData = chunkCache.get(uploadId);
      if (!chunkData) {
        return NextResponse.json(
          { error: 'Upload session not found or expired' },
          { status: 400 }
        );
      }
      tempFilePath = chunkData.tempFilePath;
      chunkData.currentChunk = chunkIndex;
      chunkCache.set(uploadId, chunkData);
    }

    // Convert blob to array buffer
    const buffer = Buffer.from(await chunkBlob.arrayBuffer());

    try {
      // Check if we need to create a new file or append to existing
      if (chunkIndex === 0) {
        // Create new file
        fs.writeFileSync(tempFilePath, buffer);
      } else {
        // Append to existing file
        fs.appendFileSync(tempFilePath, buffer);
      }
    } catch (fsError) {
      console.error('Error writing chunk to temporary file:', fsError);
      return NextResponse.json(
        { error: 'Failed to process chunk' },
        { status: 500 }
      );
    }

    // If this is the last chunk, return success with the complete file info
    if (chunkIndex === totalChunks - 1) {
      const chunkData = chunkCache.get(uploadId);
      if (!chunkData) {
        return NextResponse.json(
          { error: 'Upload session not found' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'All chunks uploaded successfully',
        uploadId,
        fileName,
        tempFilePath,
        studySessionId,
        useAI,
        complete: true,
      });
    }

    // For intermediate chunks, just return success
    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1} of ${totalChunks} uploaded successfully`,
      uploadId,
      chunkIndex,
      complete: false,
    });
  } catch (error) {
    console.error('Error processing chunk upload:', error);
    return NextResponse.json(
      { error: 'Error processing chunk upload' },
      { status: 500 }
    );
  }
}

// Also handle processing a complete file
export async function PUT(request: NextRequest) {
  try {
    // Authenticate the request using the correct approach for Next.js 15
    const supabase = await createClient();
    
    // Get the current user
    const { data, error: _userError } = await supabase.auth.getUser();
    const user = data.user;
    
    if (!user?.id && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }

    // Get processing request info
    const { uploadId } = await request.json();

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Missing uploadId parameter' },
        { status: 400 }
      );
    }

    // Get the chunk data
    const chunkData = chunkCache.get(uploadId);
    if (!chunkData) {
      return NextResponse.json(
        { error: 'Upload session not found or expired' },
        { status: 400 }
      );
    }

    // Check if the file exists
    if (!fs.existsSync(chunkData.tempFilePath)) {
      return NextResponse.json(
        { error: 'Uploaded file not found' },
        { status: 400 }
      );
    }

    // Forward the request to the PDF processing endpoint
    // This will happen server-side, so no need for the client to handle this

    // Clean up temp file and cache entry
    // (In production, you might want to keep the file for a while and implement a cleanup job)
    chunkCache.delete(uploadId);

    return NextResponse.json({
      success: true,
      message: 'File ready for processing',
      uploadId,
      fileName: chunkData.fileName,
      fileSize: chunkData.totalSize,
    });
  } catch (error) {
    console.error('Error starting PDF processing:', error);
    return NextResponse.json(
      { error: 'Error starting PDF processing' },
      { status: 500 }
    );
  }
} 