import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { NewGradeEntry } from '@/types/grading';

// GET /api/grade-entries
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const componentId = searchParams.get('grading_component_id');
  
  if (!componentId) {
    return NextResponse.json(
      { error: 'Missing grading component ID' },
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
    
    // Verify the component belongs to the user
    const { data: component, error: componentError } = await supabase
      .from('grading_components')
      .select('*, grading_system:grading_system_id(user_id)')
      .eq('id', componentId)
      .single();
    
    if (componentError || !component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }
    
    if (component.grading_system.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this component' },
        { status: 403 }
      );
    }
    
    const { data, error } = await supabase
      .from('grade_entries')
      .select('*')
      .eq('grading_component_id', componentId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching grade entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grade entries' },
      { status: 500 }
    );
  }
}

// POST /api/grade-entries
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
    
    const body: NewGradeEntry = await request.json();
    
    if (!body.component_id || !body.name || body.score === undefined || body.max_score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify the component belongs to the user
    const { data: component, error: componentError } = await supabase
      .from('grading_components')
      .select('*, grading_system:grading_system_id(user_id)')
      .eq('id', body.component_id)
      .single();
    
    if (componentError || !component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }
    
    if (component.grading_system.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to add entries to this component' },
        { status: 403 }
      );
    }
    
    // Validate score is not greater than max_score
    if (body.score > body.max_score) {
      return NextResponse.json(
        { error: 'Score cannot be greater than max score' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('grade_entries')
      .insert([
        {
          component_id: body.component_id,
          name: body.name,
          score: body.score,
          max_score: body.max_score,
          date: body.date || new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error creating grade entry:', error);
    return NextResponse.json(
      { error: 'Failed to create grade entry' },
      { status: 500 }
    );
  }
}

// PATCH /api/grade-entries
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
    
    if (!body.id || !body.name || body.score === undefined || body.max_score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get the entry to update
    const { data: entry, error: entryError } = await supabase
      .from('grade_entries')
      .select('*, component:grading_component_id(grading_system_id)')
      .eq('id', body.id)
      .single();
    
    if (entryError || !entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }
    
    // Verify the entry belongs to the user
    const { data: gradingSystem, error: gradingSystemError } = await supabase
      .from('grading_systems')
      .select('user_id')
      .eq('id', entry.component.grading_system_id)
      .single();
    
    if (gradingSystemError || !gradingSystem) {
      return NextResponse.json(
        { error: 'Grading system not found' },
        { status: 404 }
      );
    }
    
    if (gradingSystem.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this entry' },
        { status: 403 }
      );
    }
    
    // Validate score is not greater than max_score
    if (body.score > body.max_score) {
      return NextResponse.json(
        { error: 'Score cannot be greater than max score' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('grade_entries')
      .update({
        name: body.name,
        score: body.score,
        max_score: body.max_score,
        date: body.date || entry.date,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating grade entry:', error);
    return NextResponse.json(
      { error: 'Failed to update grade entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/grade-entries
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { error: 'Missing entry ID' },
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
    
    // Get the entry to delete
    const { data: entry, error: entryError } = await supabase
      .from('grade_entries')
      .select('*, component:grading_component_id(grading_system_id)')
      .eq('id', id)
      .single();
    
    if (entryError || !entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }
    
    // Verify the entry belongs to the user
    const { data: gradingSystem, error: gradingSystemError } = await supabase
      .from('grading_systems')
      .select('user_id')
      .eq('id', entry.component.grading_system_id)
      .single();
    
    if (gradingSystemError || !gradingSystem) {
      return NextResponse.json(
        { error: 'Grading system not found' },
        { status: 404 }
      );
    }
    
    if (gradingSystem.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this entry' },
        { status: 403 }
      );
    }
    
    const { error } = await supabase
      .from('grade_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting grade entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete grade entry' },
      { status: 500 }
    );
  }
} 