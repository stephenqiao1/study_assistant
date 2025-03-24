import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/reminders
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const study_session_id = searchParams.get('study_session_id');
    
    // Get all reminders for the user
    let query = supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id);

    // If study_session_id is provided, filter by it
    if (study_session_id) {
      query = query.eq('study_session_id', study_session_id);
    }

    const { data, error } = await query.order('due_date', { ascending: true });
    
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

// POST /api/reminders
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
    
    const body = await request.json();

    // Validate all required fields
    const missingFields = [];
    if (!body.title) missingFields.push('title');
    if (!body.due_date) missingFields.push('due_date');
    if (!body.type) missingFields.push('type');
    if (!body.study_session_id) missingFields.push('study_session_id');
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate type value
    if (!['assignment', 'exam'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be either "assignment" or "exam"' },
        { status: 400 }
      );
    }
    
    // Create new reminder
    const { data, error } = await supabase
      .from('reminders')
      .insert([
        {
          title: body.title,
          due_date: body.due_date,
          type: body.type,
          user_id: user.id,
          study_session_id: body.study_session_id
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create reminder' },
      { status: 500 }
    );
  }
}

// DELETE /api/reminders
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing reminder ID' },
        { status: 400 }
      );
    }
    
    // Delete reminder
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user can only delete their own reminders
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}