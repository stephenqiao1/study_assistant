import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const filter = searchParams.get('filter') || 'all';
    const sort = searchParams.get('sort') || 'default';
    const noteId = searchParams.get('noteId');

    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    let query = supabase
      .from('flashcards')
      .select('*')
      .eq('study_session_id', moduleId);

    // Apply note filter if noteId is provided
    if (noteId) {
      query = query.eq('source_note_id', noteId);
    }

    // Apply status filter
    switch (filter) {
      case 'difficult':
        query = query.eq('last_recall_rating', 'hard');
        break;
      case 'easy':
        query = query.eq('last_recall_rating', 'easy');
        break;
      case 'new':
        query = query.eq('status', 'new');
        break;
      case 'mastered':
        query = query.eq('status', 'known');
        break;
    }

    // Apply sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'difficulty':
        // Sort by status (new -> learning -> known) and then by last review date
        query = query.order('status', { ascending: true })
                    .order('last_reviewed_at', { ascending: true });
        break;
      default:
        // Default sorting: prioritize due cards (next_review_at), then by status
        query = query.order('next_review_at', { ascending: true })
                    .order('status', { ascending: true });
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flashcards' },
      { status: 500 }
    );
  }
} 