import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface PracticeQuestion {
  id: string;
  created_at: string;
  user_id: string;
  study_session_id: string;
  question_text: string;
  question_image_url?: string; // URL to the question image
  answer_text: string;
  answer_image_url?: string; // URL to the answer image
  source: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  last_practiced_at: string | null;
  times_practiced: number;
  confidence_level: number;
  notes: string | null;
  parent_question_id?: string; // Reference to the original question if this is a variant
}

export interface CreatePracticeQuestionParams {
  study_session_id: string;
  question_text: string;
  question_image_url?: string;
  answer_text: string;
  answer_image_url?: string;
  source?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  notes?: string | null;
  parent_question_id?: string; // Reference to the original question if this is a variant
}

export interface UpdatePracticeQuestionParams {
  id: string;
  question_text?: string;
  question_image_url?: string;
  answer_text?: string;
  answer_image_url?: string;
  source?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  notes?: string | null;
}

export interface PracticeSessionResult {
  question_id: string;
  correct: boolean;
  confidence_level: number;
  time_spent_seconds: number;
}

// Define a type for the update data object based on the UpdatePracticeQuestionParams interface
type PracticeQuestionUpdateData = Omit<UpdatePracticeQuestionParams, 'id'> & {
  question_image_url?: string;
  answer_image_url?: string;
  last_practiced_at?: string | null;
  times_practiced?: number;
  confidence_level?: number;
};

/**
 * Create a new practice question
 */
export async function createPracticeQuestion(params: CreatePracticeQuestionParams): Promise<PracticeQuestion | null> {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return null;
    }

    const newQuestion = {
      id: uuidv4(),
      user_id: user.id,
      study_session_id: params.study_session_id,
      question_text: params.question_text,
      question_image_url: params.question_image_url,
      answer_text: params.answer_text,
      answer_image_url: params.answer_image_url,
      source: params.source || '',
      tags: params.tags || [],
      difficulty: params.difficulty || 'medium',
      last_practiced_at: null,
      times_practiced: 0,
      confidence_level: 0,
      notes: params.notes || null,
      parent_question_id: params.parent_question_id || null,
    };

    const { data, error } = await supabase
      .from('practice_questions')
      .insert(newQuestion)
      .select()
      .single();

    if (error) {
      console.error('Error creating practice question:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createPracticeQuestion:', error);
    return null;
  }
}

/**
 * Get all practice questions for a study session
 */
export async function getPracticeQuestionsBySession(sessionId: string): Promise<PracticeQuestion[]> {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return [];
    }

    const { data, error } = await supabase
      .from('practice_questions')
      .select('*')
      .eq('study_session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching practice questions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPracticeQuestionsBySession:', error);
    return [];
  }
}

/**
 * Get a single practice question by ID
 */
export async function getPracticeQuestionById(id: string): Promise<PracticeQuestion | null> {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return null;
    }

    const { data, error } = await supabase
      .from('practice_questions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching practice question:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getPracticeQuestionById:', error);
    return null;
  }
}

/**
 * Update a practice question
 */
export async function updatePracticeQuestion(params: UpdatePracticeQuestionParams): Promise<PracticeQuestion | null> {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return null;
    }

    // Create an object with only the fields to update
    const updateData: PracticeQuestionUpdateData = {};
    if (params.question_text !== undefined) updateData.question_text = params.question_text;
    if (params.question_image_url !== undefined) updateData.question_image_url = params.question_image_url;
    if (params.answer_text !== undefined) updateData.answer_text = params.answer_text;
    if (params.answer_image_url !== undefined) updateData.answer_image_url = params.answer_image_url;
    if (params.source !== undefined) updateData.source = params.source;
    if (params.tags !== undefined) updateData.tags = params.tags;
    if (params.difficulty !== undefined) updateData.difficulty = params.difficulty;
    if (params.notes !== undefined) updateData.notes = params.notes;

    const { data, error } = await supabase
      .from('practice_questions')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating practice question:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updatePracticeQuestion:', error);
    return null;
  }
}

/**
 * Delete a practice question
 */
export async function deletePracticeQuestion(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return false;
    }

    const { error } = await supabase
      .from('practice_questions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting practice question:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePracticeQuestion:', error);
    return false;
  }
}

/**
 * Record a practice session result
 */
export async function recordPracticeResult(result: PracticeSessionResult): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return false;
    }

    // Get the current question
    const { data: question, error: fetchError } = await supabase
      .from('practice_questions')
      .select('*')
      .eq('id', result.question_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !question) {
      console.error('Error fetching practice question:', fetchError);
      return false;
    }

    // Update the question with practice results
    const { error: updateError } = await supabase
      .from('practice_questions')
      .update({
        last_practiced_at: new Date().toISOString(),
        times_practiced: question.times_practiced + 1,
        confidence_level: result.confidence_level,
      })
      .eq('id', result.question_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating practice question:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in recordPracticeResult:', error);
    return false;
  }
} 