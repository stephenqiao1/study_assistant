import { NextResponse } from 'next/server'
import { SubscriptionTier, SubscriptionInterval } from '@/types/supabase'
import { stripe } from '@/utils/stripe'

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

    // Configure the items in the checkout session based on tier and interval
    const priceId = getPriceId(tier as Exclude<SubscriptionTier, 'free'>, interval as SubscriptionInterval);

    // Create Stripe checkout session for guest checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}?success=true`,
      cancel_url: `${returnUrl}?canceled=true`,
      discounts: [
        {
          coupon: 'Rb1UQ59X',
        },
      ],
      billing_address_collection: 'required',
    });

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error in guest-checkout:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to get the price ID based on tier and interval
function getPriceId(tier: Exclude<SubscriptionTier, 'free'>, interval: SubscriptionInterval): string {
  // These IDs should be stored in environment variables in a real application
  const priceIds = {
    basic: {
      month: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID!,
      year: process.env.STRIPE_BASIC_YEARLY_PRICE_ID!,
    },
    pro: {
      month: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
      year: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
    },
  };

  return priceIds[tier][interval];
} 