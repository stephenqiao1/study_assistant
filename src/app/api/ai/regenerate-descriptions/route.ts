import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface _Formula {
  id: string
  formula: string
  latex: string
  description: string
  category: string
  is_block: boolean
  source_note_id: string
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
  
  try {
    const { study_session_id, formulas } = await request.json()
    
    if (!formulas || !Array.isArray(formulas) || formulas.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid formulas data' },
        { status: 400 }
      )
    }
    
    if (!study_session_id) {
      return NextResponse.json(
        { error: 'Missing study session ID' },
        { status: 400 }
      )
    }
    
    const formulasPrompt = formulas.map(f => 
      `Formula: ${f.formula}\nLatex: ${f.latex}\nCurrent Description: ${f.description || 'None'}\nCategory: ${f.category}`
    ).join('\n\n');
    
    // Enhance descriptions using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a specialized mathematical formula description assistant. Your task is to enhance the descriptions of the provided formulas.
          
          For each formula, provide:
          1. A clear, concise description explaining what the formula represents
          2. Use appropriate mathematical terminology
          3. Make sure the description is suitable for students learning the subject
          
          Respond with a JSON object containing an array of objects with "id" and "description" fields.`
        },
        {
          role: 'user',
          content: formulasPrompt
        }
      ]
    })
    
    const responseContent = completion.choices[0].message.content
    
    if (!responseContent) {
      return NextResponse.json(
        { error: 'Failed to generate descriptions' },
        { status: 500 }
      )
    }
    
    let enhancedDescriptions: { id: string, description: string }[]
    
    try {
      const parsedResponse = JSON.parse(responseContent)
      enhancedDescriptions = parsedResponse.descriptions || []
      
      // If the response doesn't match our expected format, handle it
      if (!enhancedDescriptions || !Array.isArray(enhancedDescriptions)) {
        // Try to map the formulas with their original IDs but enhanced descriptions
        enhancedDescriptions = formulas.map((formula, index) => ({
          id: formula.id,
          description: parsedResponse[`formula_${index + 1}`]?.description || formula.description
        }))
      }
    } catch (error) {
      console.error('Error parsing descriptions response:', error)
      return NextResponse.json(
        { error: 'Failed to parse descriptions response' },
        { status: 500 }
      )
    }
    
    // Update formulas in the database
    for (const { id, description } of enhancedDescriptions) {
      if (id && description) {
        const { error } = await supabase
          .from('formulas')
          .update({ description })
          .eq('id', id)
          .eq('study_session_id', study_session_id)
        
        if (error) {
          console.error(`Error updating formula ${id}:`, error)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${enhancedDescriptions.length} formula descriptions updated`
    })
    
  } catch (error) {
    console.error('Error in regenerate-descriptions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 