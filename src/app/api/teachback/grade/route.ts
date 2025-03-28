import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  // Create a Supabase client using the modern approach
  const supabase = await createClient()

  try {
    // Get the authenticated user
    const { data: { user }, error: _userError } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const { noteId, noteContent, teachbackText } = body

    // Validate input with detailed errors
    const missingFields = []
    if (!noteId) missingFields.push('noteId')
    if (!noteContent) missingFields.push('noteContent')
    if (!teachbackText) missingFields.push('teachbackText')

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields)
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Get the note to find its study session
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('study_session_id')
      .eq('id', noteId)
      .eq('user_id', user.id) // Verify note belongs to user
      .single()

    if (noteError || !note) {
      console.error('Error finding note:', noteError)
      return NextResponse.json(
        { error: 'Could not find the associated note' },
        { status: 400 }
      )
    }

    const studySessionId = note.study_session_id

    // Verify the study session exists and belongs to the user
    const { data: studySession, error: studySessionError } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('id', studySessionId)
      .eq('user_id', user.id)
      .single()

    if (studySessionError || !studySession) {
      console.error('Error finding study session:', studySessionError)
      return NextResponse.json(
        { error: 'Could not find the associated study session' },
        { status: 400 }
      )
    }

    // Use OpenAI to grade the teachback
    const prompt = `As an expert tutor, grade the following explanation of a concept. The original content is:

${noteContent}

The student's explanation is:
${teachbackText}

Grade this explanation on a scale of 0-100 and provide detailed, constructive feedback. Focus on:
1. Accuracy of understanding
2. Completeness of explanation
3. Clarity of communication

Respond in the following JSON format:
{
  "score": number (0-100),
  "feedback": "detailed feedback with specific suggestions for improvement"
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an expert tutor grading student explanations." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    })

    const response = completion.choices[0].message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    const gradeResult = JSON.parse(response)

    // Save the teachback to the database
    const { data: _teachback, error: teachbackError } = await supabase
      .from('teachbacks')
      .insert({
        user_id: user.id,
        note_id: noteId,
        content: teachbackText,
        grade: gradeResult.score,
        feedback: { text: gradeResult.feedback },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (teachbackError) {
      console.error('Error saving teachback:', teachbackError)
      return NextResponse.json(
        { error: 'Failed to save teachback' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      score: gradeResult.score / 100, // Convert to 0-1 scale for frontend
      feedback: gradeResult.feedback
    })

  } catch (error) {
    console.error('Error in teachback grading:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 