import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface NoteInput {
  title: string
  content: string
  tags: string[]
}

export async function POST(request: NextRequest) {
  // Get the current user using the modern createClient approach
  const supabase = await createClient()
  
  // Get the current user using getUser
  const { data, error: userError } = await supabase.auth.getUser()
  const user = data.user
  
  // Log authentication status for debugging
  console.log({
    hasUser: !!user, 
    userId: user?.id, 
    errorMessage: userError?.message,
    isDev: process.env.NODE_ENV === 'development'
  });
  
  // Determine user ID
  let userId: string;
  
  if (user?.id) {
    // Always prefer the actual user ID from Supabase when available
    userId = user.id;
  } else if (process.env.NODE_ENV === 'development') {
    // Last resort fallback for development only when no session exists
    // Check for a stored user ID in environment variables
    const devUserId = process.env.NEXT_PUBLIC_DEV_USER_ID;
    
    if (devUserId && devUserId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      // Use the developer's actual Supabase user ID stored in env
      userId = devUserId;
    } else {
      // Final fallback - use a valid UUID format
      userId = '00000000-0000-4000-a000-000000000001';
    }
  } else {
    // In production, no session means unauthorized
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  try {
    // Parse request body
    const body = await request.json()
    const { studySessionId, notes } = body as { studySessionId: string, notes: NoteInput[] }
    
    if (!studySessionId || !notes || !Array.isArray(notes) || notes.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Check if study session exists and belongs to the current user
    let _studySession = null;
      
    // In development mode, bypass the database check if using fallback auth
    if (process.env.NODE_ENV === 'development' && 
        (!user?.id || userId !== user?.id)) {
      // Create a mock study session
      _studySession = { 
        id: studySessionId,
        user_id: userId,
        name: "Development Session"
      };
    } else {
      // Do the actual database check
      const { data: dbStudySession, error: sessionError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('id', studySessionId)
        .eq('user_id', userId)
        .single();
        
      if (sessionError || !dbStudySession) {
        return NextResponse.json(
          { error: 'Study session not found or not authorized' },
          { status: 404 }
        )
      }
      
      _studySession = dbStudySession;
    }
    
    // Create all notes in the database
    const notesWithMetadata = notes.map(note => {
      // Extract only the fields we need for the database
      // to avoid "column not found" errors
      const { title, content, tags } = note;
      
      return {
        title,
        content,
        tags: tags || [],
        study_session_id: studySessionId,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    // Always insert to database, even in development mode
    const result = await supabase
      .from('notes')
      .insert(notesWithMetadata)
      .select();
    
    const createdNotes = result.data;
    const insertError = result.error;
    
    if (insertError) {
      console.error('Error creating notes:', insertError)
      return NextResponse.json(
        { 
          error: 'Failed to create notes', 
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint || null
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      message: `Successfully created ${notes.length} notes`,
      notes: createdNotes
    })
  } catch (error) {
    console.error('Note creation error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
} 