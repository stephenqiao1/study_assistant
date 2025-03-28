import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/utils/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface Note {
  id: string;
  content: string;
  title: string;
  user_id: string;
}

interface FlashcardData {
  question: string;
  answer: string;
}

interface FlashcardsResponse {
  flashcards: FlashcardData[];
}

interface StudySession {
  id: string;
  module_title: string | null;
}

export async function POST(req: Request) {
  try {
    const { noteId, moduleId } = await req.json();
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Get the study session to get the module title
    const { data: studySession, error: sessionError } = await supabase
      .from('study_sessions')
      .select('module_title')
      .eq('id', moduleId)
      .single();

    if (sessionError || !studySession) {
      console.error('Error fetching study session:', sessionError);
      return NextResponse.json({ error: 'Failed to fetch study session' }, { status: 500 });
    }
    
    // Get the note content and user ID
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single<Note>();
    
    if (noteError) {
      console.error('Error fetching note:', noteError);
      return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
    }
      
    if (!note || !note.content) {
      return NextResponse.json({ error: 'Note not found or empty' }, { status: 404 });
    }

    // Generate flashcards using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI that creates flashcards from study notes. Create concise, clear question-answer pairs that test understanding of the material. Format your response as a JSON object with a 'flashcards' array containing objects with 'question' and 'answer' properties."
        },
        {
          role: "user",
          content: `Create flashcards from this note: ${note.content}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const flashcardsData = JSON.parse(content) as FlashcardsResponse;
    
    // Insert flashcards into database
    const { data: flashcards, error: insertError } = await supabase
      .from('flashcards')
      .insert(
        flashcardsData.flashcards.map((card: FlashcardData) => ({
          question: card.question,
          answer: card.answer,
          study_session_id: moduleId,
          module_title: (studySession as StudySession).module_title || 'Untitled Module',
          user_id: note.user_id,
          source_note_id: note.id,
          created_at: new Date().toISOString(),
          status: 'new',
          ease_factor: 2.5,
          review_interval: 0,
          repetitions: 0
        }))
      )
      .select();

    if (insertError) {
      console.error('Error inserting flashcards:', insertError);
      return NextResponse.json({ error: 'Failed to save flashcards' }, { status: 500 });
    }

    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error('Error in flashcard generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 }
    );
  }
} 