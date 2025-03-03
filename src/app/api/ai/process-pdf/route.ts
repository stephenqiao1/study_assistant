import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { processWithAI } from '@/utils/ai-helpers'

/**
 * API endpoint to process PDF text using OpenAI
 * It creates structured notes from raw text extracted from PDFs
 * The notes will maintain LaTeX formatting and be optimized for the module type
 */
export async function POST(request: Request) {
  try {
    // Use the modern createClient approach that properly handles Next.js 15 cookies
    const supabase = await createClient()
    
    // Use getUser for authentication
    const { data, error } = await supabase.auth.getUser()
    
    // Check if in development mode
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // If not in development and no user, return unauthorized
    if (!isDevelopment && (error || !data.user)) {
      console.error('Auth error:', error)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
   
    // Get the raw text and metadata from the request
    const { text, fileName, moduleType, studySessionId } = await request.json()
    
    if (!text || !fileName) {
      return NextResponse.json(
        { error: 'Text and fileName are required' },
        { status: 400 }
      )
    }

    // Optional: Get module type information if studySessionId is provided
    let moduleContext = '';
    if (studySessionId) {
      try {
        // Query the study session to get module information
        const { data: studySession, error } = await supabase
          .from('study_sessions')
          .select('modules(id, title, subject, description)')
          .eq('id', studySessionId)
          .maybeSingle();
        
        if (!error && studySession?.modules) {
          // Fix: access the first module in the array if modules is an array
          const moduleData = Array.isArray(studySession.modules) 
            ? studySession.modules[0] 
            : studySession.modules;
          
          if (moduleData) {
            moduleContext = `The PDF is for a module about "${moduleData.title}" in the subject "${moduleData.subject}". ${moduleData.description || ''}`;
          }
        }
      } catch (error) {
        console.error('Error getting module context:', error);
        // Continue without module context
      }
    }

    // Customize model based on module type if provided
    let model = "gpt-4o-2024-08-06"; // Default model
    
    // For math/science modules, use a model good with LaTeX
    if (moduleType && ['math', 'physics', 'chemistry', 'engineering'].includes(moduleType.toLowerCase())) {
      model = "gpt-4o-2024-08-06"; // This model is good with LaTeX
    }

    
    // Add module context to the system prompt if available
    const systemPromptAddition = moduleContext 
      ? `\n\n${moduleContext}\nPlease format these notes to match the style appropriate for this subject.` 
      : '';

    // Process the text with AI with additional context
    const aiProcessedNotes = await processWithAI(
      text, 
      fileName,
      model,
      false, // Not a retry
      systemPromptAddition // Add module context to the system prompt
    );
    
    
    // Return the processed notes
    return NextResponse.json({ 
      notes: aiProcessedNotes.map(note => ({
        ...note,
        // Add user_id to each note for row-level security
        user_id: data.user?.id || (isDevelopment ? process.env.NEXT_PUBLIC_DEV_USER_ID : undefined)
      })),
      message: `Successfully processed PDF and created ${aiProcessedNotes.length} notes`
    });
  } catch (error) {
    console.error('Error processing PDF with AI:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process PDF with AI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 