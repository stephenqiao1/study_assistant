import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { NewGradingSystem } from '@/types/grading';

// GET /api/grading-systems
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studySessionId = searchParams.get('study_session_id');
  
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    let query = supabase
      .from('grading_systems')
      .select(`
        *,
        components:grading_components(
          *,
          entries:grade_entries(*)
        )
      `)
      .eq('user_id', userId);
    
    if (studySessionId) {
      query = query.eq('study_session_id', studySessionId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Add cache control headers to prevent multiple fetches
    return NextResponse.json(
      { data },
      { 
        headers: {
          'Cache-Control': 'private, max-age=60', // Cache for 60 seconds
          'Vary': 'Cookie' // Vary based on user session
        }
      }
    );
  } catch (error) {
    console.error('Error fetching grading systems:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grading systems' },
      { status: 500 }
    );
  }
}

// POST /api/grading-systems
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    const body: NewGradingSystem = await request.json();
    
    if (!body.study_session_id || !body.target_grade) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if a grading system already exists for this study session
    const { data: existingSystems } = await supabase
      .from('grading_systems')
      .select('id')
      .eq('study_session_id', body.study_session_id)
      .eq('user_id', userId);
    
    if (existingSystems && existingSystems.length > 0) {
      return NextResponse.json(
        { error: 'A grading system already exists for this study session' },
        { status: 409 }
      );
    }
    
    const { data, error } = await supabase
      .from('grading_systems')
      .insert({
        user_id: userId,
        study_session_id: body.study_session_id,
        target_grade: body.target_grade
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error creating grading system:', error);
    return NextResponse.json(
      { error: 'Failed to create grading system' },
      { status: 500 }
    );
  }
}

// PATCH /api/grading-systems
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    if (!body.id || !body.target_grade) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('grading_systems')
      .update({
        target_grade: body.target_grade,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating grading system:', error);
    return NextResponse.json(
      { error: 'Failed to update grading system' },
      { status: 500 }
    );
  }
}

// DELETE /api/grading-systems
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { error: 'Missing grading system ID' },
      { status: 400 }
    );
  }
  
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { error } = await supabase
      .from('grading_systems')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting grading system:', error);
    return NextResponse.json(
      { error: 'Failed to delete grading system' },
      { status: 500 }
    );
  }
} 