import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { hasSubscriptionTier } from '@/utils/subscription-helpers'

interface NoteInput {
  title: string
  content: string
  tags: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get request body
    const { studySessionId, notes } = await request.json()
    
    if (!studySessionId || !notes || !Array.isArray(notes)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Type check the notes array
    const typedNotes = notes as NoteInput[];
    
    // Verify study session exists and belongs to user
    const { data: studySession, error: studySessionError } = await supabase
      .from('study_sessions')
      .select('id, user_id')
      .eq('id', studySessionId)
      .eq('user_id', user.id)
      .single()
    
    if (studySessionError || !studySession) {
      return NextResponse.json(
        { error: 'Study session not found or not authorized' },
        { status: 404 }
      )
    }
    
    // Check if user has basic or pro subscription
    const hasPremiumAccess = await hasSubscriptionTier(user.id, 'basic') || 
                            await hasSubscriptionTier(user.id, 'pro')
    
    if (!hasPremiumAccess) {
      return NextResponse.json(
        { 
          error: 'Premium feature', 
          message: 'Document import is only available for Basic and Pro tier subscribers.' 
        },
        { status: 403 }
      )
    }
    
    // Prepare notes for insertion
    const notesToInsert = typedNotes.map(note => ({
      study_session_id: studySessionId,
      user_id: user.id,
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    // Insert notes in a single transaction
    const { data: createdNotes, error: insertError } = await supabase
      .from('notes')
      .insert(notesToInsert)
      .select()
    
    if (insertError) {
      console.error('❌ Debug - Insert Error:', {
        error: insertError,
        errorMessage: insertError.message,
        errorCode: insertError.code,
        details: insertError.details
      })
      return NextResponse.json(
        { error: 'Failed to create notes' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      notes: createdNotes
    })
  } catch (error) {
    console.error('❌ Debug - Unexpected Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    })
    return NextResponse.json(
      { error: 'Failed to create notes' },
      { status: 500 }
    )
  }
} 