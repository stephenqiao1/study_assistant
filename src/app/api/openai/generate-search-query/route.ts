import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  // Create a Supabase client
  const supabase = createRouteHandlerClient({ cookies })

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development'

  try {
    // Authenticate the user (skip in development)
    if (!isDevelopment) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Get the request body
    const { content, prompt } = await request.json()

    // Validate the request
    if (!content || !prompt) {
      return NextResponse.json(
        { error: 'Content and prompt are required' },
        { status: 400 }
      )
    }

    // Generate a search query using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates concise search queries based on educational content.',
        },
        {
          role: 'user',
          content: `${prompt}\n\nContent: ${content}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    })

    // Extract the generated search query
    const searchQuery = completion.choices[0].message.content?.trim()

    // Return the search query
    return NextResponse.json({ searchQuery })
  } catch (error) {
    console.error('Error generating search query:', error)
    return NextResponse.json(
      { error: 'Failed to generate search query' },
      { status: 500 }
    )
  }
} 