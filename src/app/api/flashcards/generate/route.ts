import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/utils/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    const { _moduleTitle, moduleId, content, noteId } = await request.json()

    if (!moduleId || !content) {
      return NextResponse.json(
        { error: 'Module ID and content are required' },
        { status: 400 }
      )
    }
    
    // Log if noteId is missing
    if (!noteId) {
      console.warn('Warning: noteId is missing in the request. Flashcards will not be associated with a specific note.');
    }

    // Create Supabase client with the correct approach for Next.js 15
    const supabase = await createClient()

    // Get the current user and log auth details
    const { data, error: userError } = await supabase.auth.getUser()
    const user = data.user
    
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
    
    // Check user subscription tier - this feature is only for basic and pro users
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .single()
      
    if (subscriptionError) {
      console.error('Error checking subscription:', subscriptionError)
      return NextResponse.json(
        { error: 'Failed to verify subscription status' },
        { status: 403 }
      )
    }
    
    // Only basic and pro users can generate AI flashcards
    if (!subscription || (subscription.tier !== 'basic' && subscription.tier !== 'pro')) {
      return NextResponse.json(
        { error: 'AI-generated flashcards are available for Basic and Pro users only' },
        { status: 403 }
      )
    }

    // Get the study session ID - using moduleId directly as it's now the session ID
    const { data: studySession, error: sessionError } = await supabase
      .from('study_sessions')
      .select('id, module_title')
      .eq('id', moduleId)
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
    let flashcardsData;
    try {
      // First try with gpt-4-turbo-preview and JSON response format
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",  // Using a newer model that supports JSON response format
        messages: [
          {
            role: "system",
            content: `You are an expert teacher creating flashcards for students. Create 5-10 high-quality flashcards based on the provided content. 
            Each flashcard should test understanding of key concepts, not just memorization of facts.
            
            IMPORTANT: For any mathematical expressions, formulas, or equations, use LaTeX notation. 
            - Inline math should be wrapped like this: $E=mc^2$
            - Block math equations should be wrapped like this: $$E=mc^2$$
            
            Format your response as a JSON object with a 'flashcards' array containing objects with 'question' and 'answer' fields.
            Example format:
            {
              "flashcards": [
                {
                  "question": "What is Einstein's famous equation relating energy and mass?",
                  "answer": "Einstein's equation is $E=mc^2$, where $E$ is energy, $m$ is mass, and $c$ is the speed of light."
                },
                {
                  "question": "Write the quadratic formula.",
                  "answer": "The quadratic formula states that the solutions to $ax^2 + bx + c = 0$ are $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"
                }
              ]
            }`
          },
          {
            role: "user",
            content: content
          }
        ],
        response_format: { type: "json_object" }
      })

      flashcardsData = JSON.parse(completion.choices[0].message.content || '{"flashcards": []}')
    } catch (openaiError) {
      console.error('Error using gpt-4-turbo with JSON format:', openaiError);
      
      // Fallback to standard gpt-4 without response_format parameter
      const fallbackCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert teacher creating flashcards for students. Create 5-10 high-quality flashcards based on the provided content. 
            Each flashcard should test understanding of key concepts, not just memorization of facts.
            
            IMPORTANT: For any mathematical expressions, formulas, or equations, use LaTeX notation. 
            - Inline math should be wrapped like this: $E=mc^2$
            - Block math equations should be wrapped like this: $$E=mc^2$$
            
            Format your response as a JSON object with a 'flashcards' array containing objects with 'question' and 'answer' fields.
            Example format:
            {
              "flashcards": [
                {
                  "question": "What is Einstein's famous equation relating energy and mass?",
                  "answer": "Einstein's equation is $E=mc^2$, where $E$ is energy, $m$ is mass, and $c$ is the speed of light."
                },
                {
                  "question": "Write the quadratic formula.",
                  "answer": "The quadratic formula states that the solutions to $ax^2 + bx + c = 0$ are $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"
                }
              ]
            }`
          },
          {
            role: "user",
            content: content
          }
        ]
      })

      try {
        // Try to parse the response as JSON
        flashcardsData = JSON.parse(fallbackCompletion.choices[0].message.content || '{"flashcards": []}')
      } catch (parseError) {
        // If parsing fails, extract JSON using regex as a last resort
        console.error('Error parsing JSON from fallback response:', parseError);
        const responseText = fallbackCompletion.choices[0].message.content || '';
        
        // Try to extract JSON using regex
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            flashcardsData = JSON.parse(jsonMatch[0]);
          } catch {
            // If still can't parse, create a simple structure with the full text as a single flashcard
            flashcardsData = {
              flashcards: [{
                question: "Review the following content",
                answer: responseText.substring(0, 1000) // Limit length to avoid issues
              }]
            };
          }
        } else {
          // Last resort - create a simple flashcard
          flashcardsData = {
            flashcards: [{
              question: "Review the following content",
              answer: responseText.substring(0, 1000) // Limit length to avoid issues
            }]
          };
        }
      }
    }

    // Ensure we have a valid flashcards array
    if (!flashcardsData || !Array.isArray(flashcardsData.flashcards) || flashcardsData.flashcards.length === 0) {
      flashcardsData = {
        flashcards: [{
          question: "Could not generate flashcards",
          answer: "Please try again or create flashcards manually."
        }]
      };
    }

    const { error: _insertError } = await supabase
      .from('flashcards')
      .insert(
        flashcardsData.flashcards.map((card: { question: string; answer: string }) => {
          const flashcard = {
            user_id: user.id, // Required for RLS policy
            study_session_id: studySession.id,
            module_title: studySession.module_title || moduleId, // Use the actual module title when available
            question: card.question,
            answer: card.answer,
            status: 'new',
            created_at: new Date().toISOString(),
            last_reviewed_at: null,
            next_review_at: null,
            source_note_id: noteId // Add the source_note_id from the request
          };
          return flashcard;
        })
      )

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