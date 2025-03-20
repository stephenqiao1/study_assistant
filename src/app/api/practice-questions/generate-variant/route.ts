import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// For Next.js 15+
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60; // Maximum allowed for hobby plan (60 seconds)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

// Define an interface for the variant structure
interface QuestionVariant {
  question_text: string;
  answer_text: string;
}

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get request body
    const requestBody = await request.json();
    const { questionId, studySessionId, numVariants = 1 } = requestBody;
    
    // Validate required fields
    if (!questionId || !studySessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const { data: originalQuestion, error: fetchError } = await supabase
      .from('practice_questions')
      .select('*')
      .eq('id', questionId)
      .eq('user_id', data.user?.id)
      .single();
    
    if (fetchError || !originalQuestion) {
      console.error('Error fetching original question:', fetchError);
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }
    
    // Check if user is premium or in development mode
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', data.user?.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }
    
    const isPremium = profile?.is_premium || isDevelopment;
    
    if (!isPremium) {
      return NextResponse.json({ error: 'Premium feature' }, { status: 403 });
    }
    
    // Generate variants using OpenAI
    const prompt = `
      Generate ${numVariants} variant(s) of the following practice question. 
      Keep the same difficulty level (${originalQuestion.difficulty}) and test the same concept, 
      but change the specific details, numbers, or context.
      
      Original Question: ${originalQuestion.question_text}
      Original Answer: ${originalQuestion.answer_text}
      
      For each variant, provide:
      1. A question text
      2. The correct answer text
      
      IMPORTANT: Your response MUST be a valid JSON object with EXACTLY this structure:
      {
        "variants": [
          {
            "question_text": "Question 1 text here",
            "answer_text": "Answer 1 text here"
          },
          {
            "question_text": "Question 2 text here",
            "answer_text": "Answer 2 text here"
          }
        ]
      }
      
      Do not include any explanations, markdown formatting, or additional fields. Return ONLY the JSON object.
    `;
    
    try {
      // Use GPT-4 Turbo for more reliable JSON generation
      const model = "gpt-4-turbo";
      
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          { 
            role: "system", 
            content: "You are a helpful assistant that generates variants of practice questions for students. Your responses MUST be in valid JSON format with the exact structure specified. The response must be a JSON object with a 'variants' array containing objects with 'question_text' and 'answer_text' properties."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7, // Balanced between creativity and consistency
      });
 
      // Parse the response
      const responseContent = completion.choices[0].message.content;
      let parsedResponse;
      
      try {
        parsedResponse = JSON.parse(responseContent || '{"variants": []}');
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        return NextResponse.json({ error: 'Failed to generate variants', details: 'Invalid JSON response from OpenAI' }, { status: 500 });
      }
      
      // Ensure we have a variants array, even if the response format is unexpected
      let variants = [];
      
      if (Array.isArray(parsedResponse)) {
        // Handle case where OpenAI returns an array instead of an object with variants
        variants = parsedResponse.map(item => {
          if (typeof item === 'object' && item !== null) {
            return {
              question_text: item.question_text || item.question || '',
              answer_text: item.answer_text || item.answer || ''
            };
          }
          return null;
        }).filter(Boolean);
      } else if (parsedResponse.variants && Array.isArray(parsedResponse.variants)) {
        // Standard expected format
        variants = parsedResponse.variants;
      } else if (typeof parsedResponse === 'object' && parsedResponse !== null) {
        // Try to extract any properties that might contain our data
        const possibleArrays = Object.values(parsedResponse).filter(Array.isArray);
        if (possibleArrays.length > 0) {
          // Use the first array found
          const candidateArray = possibleArrays[0];
          variants = candidateArray.map(item => {
            if (typeof item === 'object' && item !== null) {
              return {
                question_text: item.question_text || item.question || '',
                answer_text: item.answer_text || item.answer || ''
              };
            }
            return null;
          }).filter(Boolean);
        }
      }
      
      if (variants.length === 0) {
        return NextResponse.json({ error: 'No variants generated', details: 'OpenAI response did not contain any valid variants' }, { status: 500 });
      }
      
      // Create new practice questions for each variant
      const newVariants = variants.map((variant: QuestionVariant) => ({
        id: uuidv4(),
        user_id: data.user?.id || (isDevelopment ? process.env.NEXT_PUBLIC_DEV_USER_ID : undefined),
        study_session_id: studySessionId,
        question_text: variant.question_text,
        answer_text: variant.answer_text,
        source: originalQuestion.source,
        tags: originalQuestion.tags,
        difficulty: originalQuestion.difficulty,
        last_practiced_at: null,
        times_practiced: 0,
        confidence_level: 0,
        notes: null,
        parent_question_id: questionId,
        created_at: new Date().toISOString(),
      }));
      
      // Insert the new variants into the database
      const { data: insertedVariants, error: insertError } = await supabase
        .from('practice_questions')
        .insert(newVariants)
        .select();
      
      if (insertError) {
        console.error('Error inserting variants:', insertError);
        return NextResponse.json({ error: 'Failed to save variants', details: insertError.message }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        variants: insertedVariants 
      });
    } catch (openAiError) {
      console.error('OpenAI API error:', openAiError);
      
      // Enhanced error logging
      let errorDetails = 'Unknown OpenAI error';
      if (openAiError instanceof Error) {
        errorDetails = openAiError.message;
        console.error('Error stack:', openAiError.stack);
        
        // Log additional details for API errors
        if ('status' in openAiError) {
          console.error('API Status:', (openAiError as Error & { status?: number }).status);
        }
        if ('response' in openAiError) {
          try {
            console.error('API Response:', JSON.stringify((openAiError as Error & { response?: { data: unknown } }).response?.data));
          } catch {
            // We don't need the error parameter, we just want to catch and log any JSON stringify errors
            console.error('Could not stringify API response');
          }
        }
      }
      
      return NextResponse.json({ 
        error: 'OpenAI API error', 
        details: errorDetails
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error generating variants:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 