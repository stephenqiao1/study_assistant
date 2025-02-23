import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia'
})

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET')
  }

  if (!signature) {
    return new NextResponse('No signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return new NextResponse('Invalid signature', { status: 400 })
  }

  const supabase = createClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const { data: user, error: userError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userError || !user) {
          console.error('Error finding user:', userError)
          return new NextResponse('User not found', { status: 404 })
        }

        const tier = subscription.metadata.tier || 'basic'
        const interval = subscription.items.data[0].price?.recurring?.interval || 'month'
        const status = subscription.status
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
        const cancelAtPeriodEnd = subscription.cancel_at_period_end

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            tier,
            interval,
            status,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: cancelAtPeriodEnd,
            stripe_subscription_id: subscription.id,
            usage_limits: tier === 'pro' 
              ? { teach_back_sessions: -1, auto_flashcards_enabled: true }
              : { teach_back_sessions: 50, auto_flashcards_enabled: true }
          })
          .eq('user_id', user.user_id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return new NextResponse('Error updating subscription', { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: user, error: userError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userError || !user) {
          console.error('Error finding user:', userError)
          return new NextResponse('User not found', { status: 404 })
        }

        // Reset to free tier
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            tier: 'free',
            interval: 'month',
            status: 'canceled',
            stripe_subscription_id: null,
            usage_limits: {
              teach_back_sessions: 10,
              auto_flashcards_enabled: false
            }
          })
          .eq('user_id', user.user_id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return new NextResponse('Error updating subscription', { status: 500 })
        }
        break
      }
    }

    return new NextResponse('Webhook processed', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new NextResponse('Webhook error', { status: 500 })
  }
} 