import { NextResponse } from 'next/server'
import { SubscriptionTier, SubscriptionInterval } from '@/types/supabase'
import { SUBSCRIPTION_PRICES, stripe } from '@/utils/stripe'

// Import the utility function that properly handles cookies
import { createClient } from '@/utils/supabase/route'

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

    // Initialize Supabase client using our utility function
    const supabase = createClient()

    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      console.error('Auth error:', sessionError)
      return NextResponse.json(
        { error: 'You must be logged in to upgrade' },
        { status: 401 }
      )
    }

    const user = session.user

    try {
      // Get price ID from configuration
      const priceId = SUBSCRIPTION_PRICES[tier as 'basic' | 'pro'][interval as 'month' | 'year']
      
      if (!priceId) {
        return NextResponse.json(
          { error: `No price found for tier ${tier} and interval ${interval}` },
          { status: 400 }
        )
      }

      // Check if user already has a Stripe customer ID
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single()
      
      let customerId = subscription?.stripe_customer_id

      // If no customer ID exists, create a new customer in Stripe
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            user_id: user.id
          }
        })
        
        customerId = customer.id

        // Create or update subscription record
        if (subscriptionError) {
          // Create new record
          await supabase.from('subscriptions').insert({
            user_id: user.id,
            stripe_customer_id: customerId,
            status: 'inactive',
            tier: 'free'
          })
        } else {
          // Update existing record
          await supabase
            .from('subscriptions')
            .update({ stripe_customer_id: customerId })
            .eq('user_id', user.id)
        }
      }

      // Create checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: returnUrl,
        subscription_data: {
          metadata: {
            user_id: user.id,
            tier,
            interval
          }
        },
        discounts: [
          {
            coupon: 'Rb1UQ59X', // 80% off coupon
          }
        ],
      })

      return NextResponse.json({ sessionId: checkoutSession.id })
    } catch (stripeError) {
      console.error('Stripe error:', stripeError)
      return NextResponse.json(
        { error: 'Failed to create checkout session', details: stripeError instanceof Error ? stripeError.message : 'Unknown error' },
        { status: 500 }
      )
    }
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