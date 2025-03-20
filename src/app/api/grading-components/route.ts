import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { NewGradingComponent } from '@/types/grading';

// GET /api/grading-components
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gradingSystemId = searchParams.get('grading_system_id');
  
  if (!gradingSystemId) {
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
    
    // Verify the grading system belongs to the user
    const { data: gradingSystem, error: gradingSystemError } = await supabase
      .from('grading_systems')
      .select('id')
      .eq('id', gradingSystemId)
      .eq('user_id', user.id)
      .single();
    
    if (gradingSystemError || !gradingSystem) {
      return NextResponse.json(
        { error: 'Grading system not found or not authorized' },
        { status: 404 }
      );
    }
    
    const { data, error } = await supabase
      .from('grading_components')
      .select(`
        *,
        entries:grade_entries(*)
      `)
      .eq('grading_system_id', gradingSystemId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching grading components:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grading components' },
      { status: 500 }
    );
  }
}

// POST /api/grading-components
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
    
    const body: NewGradingComponent = await request.json();
    
    if (!body.grading_system_id || !body.name || body.weight === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify the grading system belongs to the user
    const { data: gradingSystem, error: gradingSystemError } = await supabase
      .from('grading_systems')
      .select('id')
      .eq('id', body.grading_system_id)
      .eq('user_id', user.id)
      .single();
    
    if (gradingSystemError || !gradingSystem) {
      return NextResponse.json(
        { error: 'Grading system not found or not authorized' },
        { status: 404 }
      );
    }
    
    // Get existing components to check total weight
    const { data: existingComponents, error: componentsError } = await supabase
      .from('grading_components')
      .select('weight')
      .eq('grading_system_id', body.grading_system_id);
    
    if (componentsError) throw componentsError;
    
    const totalExistingWeight = existingComponents.reduce(
      (sum, component) => sum + component.weight, 
      0
    );
    
    // Check if adding this component would exceed 100%
    if (totalExistingWeight + body.weight > 100) {
      return NextResponse.json(
        { 
          error: 'Total weight cannot exceed 100%', 
          currentTotal: totalExistingWeight,
          requested: body.weight,
          available: 100 - totalExistingWeight
        },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('grading_components')
      .insert({
        grading_system_id: body.grading_system_id,
        name: body.name,
        weight: body.weight
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error creating grading component:', error);
    return NextResponse.json(
      { error: 'Failed to create grading component' },
      { status: 500 }
    );
  }
}

// PATCH /api/grading-components
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
    
    if (!body.id || !body.name || body.weight === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get the component to update
    const { data: component, error: componentError } = await supabase
      .from('grading_components')
      .select('*, grading_system:grading_system_id(user_id)')
      .eq('id', body.id)
      .single();
    
    if (componentError || !component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }
    
    // Verify the component belongs to the user
    if (component.grading_system.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this component' },
        { status: 403 }
      );
    }
    
    // Get all components for this grading system
    const { data: allComponents, error: componentsError } = await supabase
      .from('grading_components')
      .select('id, weight')
      .eq('grading_system_id', component.grading_system_id);
    
    if (componentsError) throw componentsError;
    
    // Calculate total weight excluding the current component
    const totalOtherWeight = allComponents
      .filter(c => c.id !== body.id)
      .reduce((sum, c) => sum + c.weight, 0);
    
    // Check if updating this component would exceed 100%
    if (totalOtherWeight + body.weight > 100) {
      return NextResponse.json(
        { 
          error: 'Total weight cannot exceed 100%', 
          currentTotal: totalOtherWeight,
          requested: body.weight,
          available: 100 - totalOtherWeight
        },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('grading_components')
      .update({
        name: body.name,
        weight: body.weight,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating grading component:', error);
    return NextResponse.json(
      { error: 'Failed to update grading component' },
      { status: 500 }
    );
  }
}

// DELETE /api/grading-components
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { error: 'Missing component ID' },
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
    
    // Get the component to delete
    const { data: component, error: componentError } = await supabase
      .from('grading_components')
      .select('*, grading_system:grading_system_id(user_id)')
      .eq('id', id)
      .single();
    
    if (componentError || !component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }
    
    // Verify the component belongs to the user
    if (component.grading_system.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this component' },
        { status: 403 }
      );
    }
    
    const { error } = await supabase
      .from('grading_components')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting grading component:', error);
    return NextResponse.json(
      { error: 'Failed to delete grading component' },
      { status: 500 }
    );
  }
} 