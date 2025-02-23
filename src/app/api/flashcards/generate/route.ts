import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { Database } from '@/types/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    const { moduleTitle, content } = await request.json()

    if (!moduleTitle || !content) {
      return NextResponse.json(
        { error: 'Module title and content are required' },
        { status: 400 }
      )
    }

    // Create Supabase client with cookies for auth
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({
      cookies: () => cookieStore
    })

    // Get the current user and log auth details
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Auth error:', userError)
      return NextResponse.json(
        { error: 'Authentication error', details: userError.message },
        { status: 401 }
      )
    }
    
    if (!user) {
      console.error('No user found')
      return NextResponse.json(
        { error: 'No authenticated user found' },
        { status: 401 }
      )
    }

    // Get the study session ID - using moduleTitle directly as it's the module_title
    const { data: studySession, error: sessionError } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('module_title', moduleTitle)
      .eq('user_id', user.id)
      .single()

    if (sessionError) {
      console.error('Error fetching study session:', sessionError)
      return NextResponse.json(
        { error: 'Study session not found' },
        { status: 404 }
      )
    }

    // Generate flashcards using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert teacher creating flashcards for students. Create 5-10 high-quality flashcards based on the provided content. 
          Each flashcard should test understanding of key concepts, not just memorization of facts.
          Format your response as a JSON object with a 'flashcards' array containing objects with 'question' and 'answer' fields.`
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: { type: "json_object" }
    })

    const flashcardsData = JSON.parse(completion.choices[0].message.content || '{"flashcards": []}')

    // Insert flashcards into the database
    const { error: insertError } = await supabase
      .from('flashcards')
      .insert(
        flashcardsData.flashcards.map((card: { question: string; answer: string }) => ({
          study_session_id: studySession.id,
          question: card.question,
          answer: card.answer,
          status: 'new'
        }))
      )

    if (insertError) {
      console.error('Error inserting flashcards:', insertError)
      throw insertError
    }

    return NextResponse.json({ 
      message: 'Flashcards generated successfully',
      count: flashcardsData.flashcards.length
    })
  } catch (error) {
    console.error('Error in flashcard generation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate flashcards',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 