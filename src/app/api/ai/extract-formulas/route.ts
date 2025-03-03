import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Define the expected structure for the formula response
interface Formula {
  formula: string
  latex: string
  description: string
  category: string
  is_block: boolean
}

interface FormulasResponse {
  formulas: Formula[]
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession()
  
  // Only enforce authentication in production
  if (!session?.user && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  const userId = session?.user?.id
  
  try {
    const { study_session_id, moduleContent } = await request.json()
    
    if (!moduleContent) {
      return NextResponse.json(
        { error: 'Missing required content' },
        { status: 400 }
      )
    }
    
    if (!study_session_id) {
      return NextResponse.json(
        { error: 'Missing study session ID' },
        { status: 400 }
      )
    }
    
    // Retrieve module title for this study session
    const { data: sessionData, error: sessionError } = await supabase
      .from('study_sessions')
      .select('module_title')
      .eq('id', study_session_id)
      .single()
    
    if (sessionError || !sessionData?.module_title) {
      return NextResponse.json(
        { error: 'Failed to retrieve module information' },
        { status: 400 }
      )
    }
    
    const moduleTitle = sessionData.module_title
    
    // Extract formulas using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a specialized mathematical formula extraction assistant. Extract all mathematical formulas, equations, and expressions from the provided text. Convert them to proper LaTeX format.
          
          For each formula:
          1. Extract the raw formula as it appears in the text
          2. Convert it to proper LaTeX syntax
          3. Write a brief description explaining what the formula represents
          4. Categorize it (e.g., Algebra, Calculus, Statistics, Physics, etc.)
          5. Determine if it should be rendered as a block (display mode) or inline
          
          Respond with a JSON object containing an array of formulas.`
        },
        {
          role: 'user',
          content: moduleContent
        }
      ]
    })
    
    const responseContent = completion.choices[0].message.content
    
    if (!responseContent) {
      return NextResponse.json(
        { error: 'Failed to generate formulas' },
        { status: 500 }
      )
    }
    
    let formulasResponse: FormulasResponse
    
    try {
      formulasResponse = JSON.parse(responseContent) as FormulasResponse
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse formulas response' },
        { status: 500 }
      )
    }
    
    // Insert formulas into the database
    const { data: notesData, error: _notesError } = await supabase
      .from('notes')
      .select('id, title')
      .eq('study_session_id', study_session_id)
      .limit(1)
    
    // Get the first note as the source
    const sourceNote = notesData && notesData.length > 0 ? notesData[0] : null
    
    if (formulasResponse.formulas && formulasResponse.formulas.length > 0) {
      // Insert formulas into the database
      const formulasToInsert = formulasResponse.formulas.map(formula => ({
        id: uuidv4(),
        formula: formula.formula,
        latex: formula.latex,
        description: formula.description,
        category: formula.category,
        is_block: formula.is_block,
        source_note_id: sourceNote?.id || null,
        study_session_id: study_session_id,
        module_title: moduleTitle,
        user_id: userId
      }))
      
      const { error: insertError } = await supabase
        .from('formulas')
        .insert(formulasToInsert)
      
      if (insertError) {
        console.error('Error inserting formulas:', insertError)
        return NextResponse.json(
          { error: 'Failed to save formulas' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: `${formulasToInsert.length} formulas extracted and saved`
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'No formulas found in the content'
      })
    }
  } catch (error) {
    console.error('Error in extract-formulas API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 