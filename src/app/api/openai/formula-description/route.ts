import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    const { formula, surroundingText } = await request.json()
    
    if (!formula) {
      return NextResponse.json(
        { error: 'Formula is required' },
        { status: 400 }
      )
    }

    // Generate description for the formula using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `You are a mathematics expert who provides clear, concise explanations of mathematical formulas.
Given a LaTeX formula, provide a brief explanation (1-2 sentences) that explains:
1. What the formula represents or calculates
2. The meaning of key variables or components
Be extremely concise and precise, no more than 50 words.`
        },
        {
          role: "user",
          content: `Formula: ${formula}
${surroundingText ? `Context from surrounding text: ${surroundingText}` : ''}`
        }
      ],
      max_tokens: 150
    })

    const description = completion.choices[0]?.message.content?.trim() || "A mathematical formula."
    
    return NextResponse.json({ description })
  } catch (error) {
    console.error('Error generating formula description:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate formula description',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 