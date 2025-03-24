import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Create a Supabase client with service role for admin access
// This bypasses RLS policies completely
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId parameter' },
      { status: 400 }
    )
  }

  try {
    // Query the subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (error) {
      console.error('DB error:', error)
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      )
    }
    
    // If no subscription found, create a default one
    if (!data) {
      try {
        // Create a default subscription record
        const { data: newSubscription, error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            tier: 'free',
            interval: 'month',
            status: 'inactive',
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: false,
            usage_limits: {
              chat_messages: 10,
              teach_back_sessions: 10,
              auto_flashcards_enabled: false
            }
          })
          .select('*')
          .single()
        
        if (insertError) {
          console.error('Error creating default subscription:', insertError)
          return NextResponse.json(
            { 
              error: 'Could not create default subscription',
              subscription: null
            },
            { status: 500 }
          )
        }
        
        return NextResponse.json({ subscription: newSubscription })
      } catch (createError) {
        console.error('Error creating default subscription:', createError)
        return NextResponse.json(
          { 
            error: 'Could not create default subscription', 
            subscription: null
          },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json({ subscription: data })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 