import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { createClient } from '@/utils/supabase/server';

// Set maximum file size to 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// The actual implementation that gets executed at runtime only
export async function processExtractRequest(request: NextRequest) {
  try {
    // Authenticate the request using the correct approach for Next.js 15
    const supabase = await createClient();
    
    // Get the current user
    const { data, error: _userError } = await supabase.auth.getUser();
    const userId = data.user?.id;
    
    // Allow development mode without authentication
    if (!userId && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Process form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const studySessionId = formData.get('studySessionId') as string;
    const _useAI = formData.get('useAI') === 'true';
    
    if (!file || !studySessionId) {
      return NextResponse.json(
        { error: 'Missing file or study session ID' },
        { status: 400 }
      );
    }
    
    // Verify file type and size
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }
    
    // Extract text from PDF
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdfParse(buffer);
      const extractedText = pdfData.text;
      
      // Create a simple note with the extracted text
      const notes = [{
        title: file.name.replace('.pdf', ''),
        content: extractedText.replace(/\n/g, '<br>'),
        tags: ['pdf', 'imported']
      }];
      
      return NextResponse.json({
        notes,
        meta: {
          filename: file.name,
          fileSize: file.size,
          noteCount: notes.length,
          textLength: extractedText.length,
          enhancedWithAI: false
        }
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      
      // Return a fallback note
      const notes = [{
        title: file.name.replace('.pdf', ''),
        content: "Could not extract content from this PDF. It may be protected or contain only images.",
        tags: ['pdf', 'import-failed']
      }];
      
      return NextResponse.json({
        notes,
        meta: {
          filename: file.name,
          fileSize: file.size,
          noteCount: 1,
          usedFallback: true
        }
      });
    }
  } catch (error) {
    console.error('Error in PDF extract route:', error);
    return NextResponse.json(
      { error: 'Server error processing PDF' },
      { status: 500 }
    );
  }
} 