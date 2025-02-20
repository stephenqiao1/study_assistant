import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { zodResponseFormat } from "openai/helpers/zod"
import { FlashcardsResponse } from '@/types/flashcards'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    const { content, prompt } = await request.json()
    
    if (!content || !prompt) {
      return NextResponse.json(
        { error: 'Content and prompt are required' },
        { status: 400 }
      )
    }

    // Generate flashcards using OpenAI with structured outputs
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `You are an expert teacher who creates high-quality flashcards. 
Generate 5 to 30 flashcards that capture the key concepts from the following module notes.
Each flashcard should have a "question" that tests understanding and an "answer" that explains the key concept.
${prompt}`
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: zodResponseFormat(FlashcardsResponse, "flashcardsResponse")
    })

    // The parsed output will match the FlashcardsResponse schema
    const flashcardsData = completion.choices[0].message.parsed
    return NextResponse.json(flashcardsData)
  } catch (error) {
    console.error('Error in OpenAI generation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 