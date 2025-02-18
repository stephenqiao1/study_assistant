import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if email already exists
    const { data: existingSubscription, error: checkError } = await supabase
      .from('newsletter_subscriptions')
      .select('id')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
      throw checkError
    }

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Email already subscribed' },
        { status: 409 }
      )
    }

    // Insert new subscription
    const { error: insertError } = await supabase
      .from('newsletter_subscriptions')
      .insert([{ 
        email,
        consent_given: true,
        status: 'active'
      }])

    if (insertError) {
      console.error('Error inserting subscription:', insertError)
      throw insertError
    }

    return NextResponse.json(
      { message: 'Successfully subscribed to newsletter' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in subscribe API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to subscribe to newsletter',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 