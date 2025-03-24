import { NextResponse } from 'next/server'
import { SubscriptionTier, SubscriptionInterval } from '@/types/supabase'
import { SUBSCRIPTION_PRICES, stripe } from '@/utils/stripe'
import { createClient } from '@/utils/supabase/server'
import Stripe from 'stripe'

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia'
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json(
        { error: 'You must be logged in to upgrade' },
        { status: 401 }
      )
    }

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

    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      const customer = await stripeInstance.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      })
      customerId = customer.id

      // Save the Stripe customer ID
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          tier: 'free',
          status: 'inactive'
        })
    }

    // Create checkout session
    const session = await stripeInstance.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env[`STRIPE_${tier.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID`],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}?success=true`,
      cancel_url: `${returnUrl}?canceled=true`,
      metadata: {
        user_id: user.id,
        tier,
        interval
      }
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 