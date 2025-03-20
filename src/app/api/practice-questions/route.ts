import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// For Next.js 15+
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Define a proper type for the updateData object
interface PracticeQuestionUpdateData {
  question_text?: string;
  question_image_url?: string | null;
  answer_text?: string;
  answer_image_url?: string | null;
  source?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  notes?: string | null;
  last_practiced_at?: string;
  times_practiced?: number;
  confidence_level?: number;
}

export async function GET(request: NextRequest) {
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
    
    // Get the study session ID from the URL
    const { searchParams } = new URL(request.url);
    const studySessionId = searchParams.get('studySessionId');
    const questionId = searchParams.get('id');
    
    // If questionId is provided, get a single question
    if (questionId) {
      const { data, error } = await supabase
        .from('practice_questions')
        .select('*')
        .eq('id', questionId)
        .eq('user_id', user?.id || process.env.NEXT_PUBLIC_DEMO_USER_ID!)
        .single();
        
      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch practice question' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(data);
    }
    
    // If studySessionId is provided, get questions for that session
    if (studySessionId) {
      const { data, error } = await supabase
        .from('practice_questions')
        .select('*')
        .eq('study_session_id', studySessionId)
        .eq('user_id', user?.id || process.env.NEXT_PUBLIC_DEMO_USER_ID!)
        .order('created_at', { ascending: false });
        
      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch practice questions' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(data);
    }
    
    // If no filters provided, get all questions for the user
    const { data, error } = await supabase
      .from('practice_questions')
      .select('*')
      .eq('user_id', user?.id || process.env.NEXT_PUBLIC_DEMO_USER_ID!)
      .order('created_at', { ascending: false });
      
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch practice questions' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET practice questions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const {
      study_session_id,
      question_text,
      question_image_url,
      answer_text,
      answer_image_url,
      source,
      tags,
      difficulty,
      notes
    } = await request.json();
    
    // Validate required fields
    if (!study_session_id || !question_text || !answer_text) {
      return NextResponse.json(
        { error: 'Missing required fields: study_session_id, question_text, and answer_text are required' },
        { status: 400 }
      );
    }
    
    // Create the new practice question
    const newQuestion = {
      id: uuidv4(),
      user_id: user?.id || process.env.NEXT_PUBLIC_DEMO_USER_ID!,
      study_session_id,
      question_text,
      question_image_url: question_image_url || null,
      answer_text,
      answer_image_url: answer_image_url || null,
      source: source || '',
      tags: tags || [],
      difficulty: difficulty || 'medium',
      last_practiced_at: null,
      times_practiced: 0,
      confidence_level: 0,
      notes: notes || null,
    };
    
    const { data, error } = await supabase
      .from('practice_questions')
      .insert(newQuestion)
      .select()
      .single();
      
    if (error) {
      return NextResponse.json(
        { error: 'Failed to create practice question' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST practice question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const {
      id,
      question_text,
      question_image_url,
      answer_text,
      answer_image_url,
      source,
      tags,
      difficulty,
      notes,
      last_practiced_at,
      times_practiced,
      confidence_level
    } = await request.json();
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id is required' },
        { status: 400 }
      );
    }
    
    // Create an object with only the fields to update
    const updateData: PracticeQuestionUpdateData = {};
    if (question_text !== undefined) updateData.question_text = question_text;
    if (question_image_url !== undefined) updateData.question_image_url = question_image_url;
    if (answer_text !== undefined) updateData.answer_text = answer_text;
    if (answer_image_url !== undefined) updateData.answer_image_url = answer_image_url;
    if (source !== undefined) updateData.source = source;
    if (tags !== undefined) updateData.tags = tags;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (notes !== undefined) updateData.notes = notes;
    if (last_practiced_at !== undefined) updateData.last_practiced_at = last_practiced_at;
    if (times_practiced !== undefined) updateData.times_practiced = times_practiced;
    if (confidence_level !== undefined) updateData.confidence_level = confidence_level;
    
    const { data, error } = await supabase
      .from('practice_questions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user?.id || process.env.NEXT_PUBLIC_DEMO_USER_ID!)
      .select()
      .single();
      
    if (error) {
      return NextResponse.json(
        { error: 'Failed to update practice question' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT practice question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    
    // Get the question ID from the URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id is required' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('practice_questions')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id || process.env.NEXT_PUBLIC_DEMO_USER_ID!);
      
    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete practice question' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE practice question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 