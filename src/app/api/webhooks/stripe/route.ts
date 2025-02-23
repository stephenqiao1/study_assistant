import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return new NextResponse('No signature', { status: 400 })
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    const supabase = createClient()

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0].price.id
        const status = subscription.status
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

        // Get the user_id from the customer metadata
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const userId = customer.metadata.user_id

        if (!userId) {
          throw new Error('No user_id in customer metadata')
        }

        // Determine tier based on price ID
        let tier = 'free'
        if (priceId === process.env.STRIPE_PRICE_ID_BASIC) {
          tier = 'basic'
        } else if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
          tier = 'pro'
        }

        // Update subscription in database
        const { error: updateError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            tier,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status,
            current_period_end: currentPeriodEnd.toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            interval: subscription.items.data[0].price.recurring?.interval || 'month',
            usage_limits: tier === 'pro'
              ? { teach_back_sessions: -1, auto_flashcards_enabled: true }
              : tier === 'basic'
              ? { teach_back_sessions: 50, auto_flashcards_enabled: true }
              : { teach_back_sessions: 10, auto_flashcards_enabled: false }
          })

        if (updateError) {
          throw updateError
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get the user_id from the customer metadata
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const userId = customer.metadata.user_id

        if (!userId) {
          throw new Error('No user_id in customer metadata')
        }

        // Update to free tier
        const { error: updateError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            tier: 'free',
            stripe_subscription_id: null,
            stripe_customer_id: customerId,
            status: 'canceled',
            current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: false,
            interval: 'month',
            usage_limits: {
              teach_back_sessions: 10,
              auto_flashcards_enabled: false
            }
          })

        if (updateError) {
          throw updateError
        }
        break
      }
    }

    return new NextResponse('Webhook processed', { status: 200 })
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return new NextResponse((err as Error).message, { status: 400 })
  }
} 