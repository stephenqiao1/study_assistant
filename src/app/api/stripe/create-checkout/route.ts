import { NextResponse } from 'next/server'
import { Database, SubscriptionTier, SubscriptionInterval } from '@/types/supabase'
import { createCheckoutSession, stripe } from '@/utils/stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { tier, interval, returnUrl } = await request.json()

    if (!tier || !interval || !returnUrl) {
      return NextResponse.json(
        { error: 'Tier, interval, and returnUrl are required' },
        { status: 400 }
      )
    }

    // Validate tier and interval
    const validTiers: SubscriptionTier[] = ['basic', 'pro']
    const validIntervals: SubscriptionInterval[] = ['month', 'year']

    if (!validTiers.includes(tier as SubscriptionTier)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      )
    }

    if (!validIntervals.includes(interval as SubscriptionInterval)) {
      return NextResponse.json(
        { error: 'Invalid interval' },
        { status: 400 }
      )
    }

    // Create a Supabase client with proper cookie handling
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      console.error('Auth error:', sessionError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const user = session.user
    
    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      // Create new customer in Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      })
      customerId = customer.id

      // Update subscription record with customer ID
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id)
    }

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      customerId,
      tier: tier as Exclude<SubscriptionTier, 'free'>,
      interval: interval as SubscriptionInterval,
      returnUrl
    })

    return NextResponse.json({ sessionId: checkoutSession.id })
  } catch (error) {
    console.error('Error in create-checkout:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 