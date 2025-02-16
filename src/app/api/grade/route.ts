import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert teacher evaluating student explanations. Provide detailed, constructive feedback and accurate scoring based on the given rubric. Format your response as a valid JSON object."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })

    // Parse the response text as JSON
    const result = JSON.parse(completion.choices[0].message.content || '{}')
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in grading API:', error)
    return NextResponse.json(
      { error: 'Failed to grade explanation' },
      { status: 500 }
    )
  }
} 