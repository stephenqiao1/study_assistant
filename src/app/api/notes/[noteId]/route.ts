import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ noteId: string }> }
) {
  try {
    // Create a Supabase client
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // If not in development and no user, return unauthorized
    if (!isDevelopment && (!user || userError)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the request body
    const { content } = await request.json();
    
    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: 'Missing required field: content is required' },
        { status: 400 }
      );
    }

    // Get the noteId from params
    const { noteId } = await context.params;
    
    // Update the note
    const { data, error } = await supabase
      .from('notes')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', user?.id || process.env.NEXT_PUBLIC_DEMO_USER_ID!)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 