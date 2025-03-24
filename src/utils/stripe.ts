import Stripe from 'stripe'
import { SubscriptionTier, SubscriptionInterval } from '@/types/supabase'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia'
})

export const SUBSCRIPTION_PRICES = {
  basic: {
    month: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || 'price_1Oq8W1G4fZDrV0u1xQkClOW0',
    year: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || 'price_1Oq8VzG4fZDrV0u1DXy0QpzL'
  },
  pro: {
    month: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_1Oq8W5G4fZDrV0u1nQBe1qfI',
    year: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_1Oq8W3G4fZDrV0u1paTc9cMH'
  }
} as const

export const TIER_LIMITS = {
  free: {
    teach_back_sessions: 10,
    auto_flashcards_enabled: false
  },
  basic: {
    teach_back_sessions: 50,
    auto_flashcards_enabled: true
  },
  pro: {
    teach_back_sessions: -1, // Unlimited
    auto_flashcards_enabled: true
  }
} as const

export async function createCheckoutSession({
  customerId,
  tier,
  interval,
  returnUrl
}: {
  customerId: string
  tier: Exclude<SubscriptionTier, 'free'>
  interval: SubscriptionInterval
  returnUrl: string
}) {
  const priceId = SUBSCRIPTION_PRICES[tier][interval]
  
  if (!priceId) {
    throw new Error(`No price found for tier ${tier} and interval ${interval}`)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: returnUrl,
    subscription_data: {
      metadata: {
        tier,
        interval
      }
    },
    discounts: [
      {
        coupon: 'Rb1UQ59X',
      },
    ],
  })

  return session
}

export async function createCustomerPortalSession({
  customerId,
  returnUrl
}: {
  customerId: string
  returnUrl: string
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  })

  return session
}

export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  return subscription
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  })
  return subscription
}

export async function reactivateSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false
  })
  return subscription
} 