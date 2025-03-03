import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/utils/supabase/server';

// Define types for formula data
interface Formula {
  formula: string;
  latex: string;
  description?: string | null;
  category?: string;
  is_block?: boolean;
}

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    // Use the modern createClient approach that properly handles Next.js 15 cookies
    const supabase = await createClient();
    
    // Use getUser for authentication
    const { data, error } = await supabase.auth.getUser();
    
    // Check if in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // If not in development and no user, return unauthorized
    if (!isDevelopment && (error || !data.user)) {
      console.error('Auth error:', error);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const { study_session_id, moduleContent } = await request.json();
    
    // Validate input
    if (!study_session_id || !moduleContent) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Check if user has access to this study session (skip in dev mode)
    if (!isDevelopment) {
      const { data: studySession, error: sessionError } = await supabase
        .from('study_sessions')
        .select('id')
        .eq('id', study_session_id)
        .eq('user_id', data.user?.id)
        .single();
        
      if (sessionError || !studySession) {
        return NextResponse.json(
          { error: 'You do not have access to this study session' },
          { status: 403 }
        );
      }
    }
    
    // Extract formulas using OpenAI
    const formulas = await extractFormulasWithAI(moduleContent);
    
    
    if (!formulas || formulas.length === 0) {
      return NextResponse.json(
        { message: 'No formulas found in the content' },
        { status: 200 }
      );
    }
    
    // Save formulas to database
    const formulaInserts = formulas.map((formula: Formula) => ({
      study_session_id,
      formula: formula.formula,
      latex: formula.latex,
      description: formula.description || null,
      category: formula.category || 'General',
      is_block: formula.is_block || false,
      // User ID is now implemented in the table
      user_id: data.user?.id || (isDevelopment ? process.env.NEXT_PUBLIC_DEV_USER_ID : undefined)
    }));
    
    
    // Try inserting formulas
    const { data: insertedData, error: insertError } = await supabase
      .from('formulas')
      .insert(formulaInserts)
      .select();
      
    if (insertError) {
      console.error('Error inserting formulas:', insertError);
      
      // Log table schema to debug column mismatch
      const { data: _tableInfo, error: tableError } = await supabase
        .from('formulas')
        .select('*')
        .limit(1);
        
      if (tableError) {
        console.error('Error checking table schema:', tableError);
      } else {
      }
      
      return NextResponse.json(
        { error: 'Failed to save formulas', details: insertError.message },
        { status: 500 }
      );
    }
    
    // Log the inserted data for debugging
    
    // Check if formulas were actually added by querying the database
    const { data: _verifyData, error: verifyError } = await supabase
      .from('formulas')
      .select('*')
      .eq('study_session_id', study_session_id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (verifyError) {
      console.error('Error verifying formulas were inserted:', verifyError);
    } else {
    }
    
    return NextResponse.json({ 
      success: true,
      count: formulas.length,
      formulas: insertedData || []
    });
    
  } catch (error) {
    console.error('Formula extraction error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function extractFormulasWithAI(content: string): Promise<Formula[]> {
  try {
    // Show a sample of the content for debugging
    
    const systemPrompt = `
      You are a mathematical formula extraction expert. Your task is to find ALL mathematical formulas, equations, 
      or expressions present in the provided content, even if they're not in LaTeX format.
      
      For each formula you find:
      - Convert it to proper LaTeX notation
      - If formulas are already in LaTeX (e.g., $e=mc^2$ or $$\\int f(x) dx$$), extract the formula without the delimiters
      - Add a brief description explaining what the formula represents
      - Categorize it (Algebra, Calculus, Statistics, Physics, etc.)
      - Set is_block to true for complex formulas that should be displayed on their own line
      
      Even extract simple mathematical expressions like "x = 5", "a + b = c", or "f(x) = x²"
      
      Be thorough - extract ALL mathematical content, even if it seems trivial.
      
      Return your response as a JSON object with a "formulas" array containing objects with these properties:
      - formula: The formula text without LaTeX delimiters
      - latex: The LaTeX representation without delimiters
      - description: A brief description of what the formula represents
      - category: A category for the formula
      - is_block: Boolean indicating if it should be displayed as a block equation
      
      If no formulas are found, return an empty array.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      response_format: { type: "json_object" }
    });
    
    // Log the raw response from OpenAI
    
    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || '{"formulas":[]}');
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      // Try to extract any JSON-like structure from the response
      const jsonMatch = response.choices[0].message.content?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Failed to extract JSON from response:", e);
          result = { formulas: [] };
        }
      } else {
        result = { formulas: [] };
      }
    }
    
    // Ensure formulas is defined
    const formulas = result.formulas || [];
    
    return formulas;
    
  } catch (error) {
    console.error('OpenAI formula extraction error:', error);
    return [];
  }
} 