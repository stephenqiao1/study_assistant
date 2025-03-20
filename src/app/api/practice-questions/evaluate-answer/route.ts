import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// For Next.js 15+
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60; // Maximum allowed for hobby plan (60 seconds)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define types for OpenAI message content
type ContentItem = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail: 'high' | 'low' | 'auto';
  };
};

export async function POST(request: NextRequest) {
  try {
    // Create a Supabase client
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // If not in development and no user, return unauthorized
    if (!isDevelopment && (!user || userError)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the request body
    const { 
      questionText, 
      questionImageUrl, 
      userAnswer, 
      userAnswerImageUrl,
      correctAnswer, 
      correctAnswerImageUrl 
    } = await request.json();
    
    if (!questionText || !correctAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields: questionText and correctAnswer are required' },
        { status: 400 }
      );
    }

    // Prepare the messages for OpenAI
    const messages = [
      {
        role: "system" as const,
        content: "You are an educational assistant that evaluates student answers to practice questions. Your task is to determine if the student's answer is correct, partially correct, or incorrect. Provide a score from 1-5 where 1 is completely wrong and 5 is completely correct. Be fair but thorough in your evaluation. If the student has provided an image as part of their answer, analyze it carefully and consider it alongside their text response."
      },
      {
        role: "user" as const,
        content: [
          { 
            type: "text" as const, 
            text: `Question: ${questionText}\n\nStudent's Answer: ${userAnswer || "No text answer provided"}\n\nCorrect Answer: ${correctAnswer}\n\nPlease evaluate if the student's answer is correct. Provide a score from 1-5 and a brief explanation.` 
          }
        ] as ContentItem[]
      }
    ];

    // Add question image if available
    if (questionImageUrl) {
      (messages[1].content as ContentItem[]).push({
        type: "image_url" as const,
        image_url: {
          url: questionImageUrl,
          detail: "high"
        }
      });
    }

    // Add user answer image if available
    if (userAnswerImageUrl) {
      (messages[1].content as ContentItem[]).push({
        type: "image_url" as const,
        image_url: {
          url: userAnswerImageUrl,
          detail: "high"
        }
      });
    }

    // Add correct answer image if available
    if (correctAnswerImageUrl) {
      (messages[1].content as ContentItem[]).push({
        type: "image_url" as const,
        image_url: {
          url: correctAnswerImageUrl,
          detail: "high"
        }
      });
    }

    // Evaluate the answer with OpenAI
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages as ChatCompletionMessageParam[],
        max_tokens: 500
      });

      // Extract the evaluation from the response
      const evaluation = response.choices[0]?.message?.content || 'No evaluation available';
      
      // Parse the score from the evaluation (assuming the AI includes a score in its response)
      let score = 0;
      const scoreMatch = evaluation.match(/score.*?([1-5])/i);
      if (scoreMatch && scoreMatch[1]) {
        score = parseInt(scoreMatch[1], 10);
      }

      // Return the evaluation and score
      return NextResponse.json({
        evaluation,
        score,
        isCorrect: score >= 4, // Consider 4-5 as correct
        isPartiallyCorrect: score === 3, // Consider 3 as partially correct
        isIncorrect: score <= 2 // Consider 1-2 as incorrect
      });
    } catch (openAiError) {
      console.error('OpenAI API error:', openAiError);
      return NextResponse.json(
        { 
          error: `OpenAI API error: ${openAiError instanceof Error ? openAiError.message : 'Unknown error'}`,
          details: openAiError
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate answer' },
      { status: 500 }
    );
  }
} 