import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database, SubscriptionTier, SubscriptionInterval } from '@/types/supabase'
import Stripe from 'stripe'

// Create a Supabase client with service role for admin access
// This bypasses RLS policies completely
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' // Use your current API version
})

// This endpoint handles Stripe webhooks to update user subscriptions

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    console.error('Missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed: ${errorMessage}`)
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${errorMessage}` },
      { status: 400 }
    )
  }

  console.log(`Webhook received: ${event.type}`)

  try {
    switch (event.type) {
      // When checkout completes successfully
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Get subscription details
        if (!session.subscription) {
          throw new Error('No subscription ID in completed checkout session')
        }
        
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        
        // Get customer ID
        const customerId = session.customer as string
        
        // Get user_id from metadata or customer
        let userId = subscription.metadata.user_id
        
        // If user_id not in metadata, look up by customer ID
        if (!userId) {
          const { data: userSubscription } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()
            
          userId = userSubscription?.user_id
          
          if (!userId) {
            console.error('Could not find user_id for customer:', customerId)
            return NextResponse.json({ received: true })
          }
        }
        
        // Determine the subscription tier from metadata or the product ID
        const tierFromMetadata = subscription.metadata.tier as SubscriptionTier | undefined
        
        // Get the first item in the subscription
        const item = subscription.items.data[0]
        if (!item || !item.price || !item.price.product) {
          throw new Error('No price or product found in subscription')
        }
        
        // Retrieve the product to get its metadata
        const productId = typeof item.price.product === 'string' 
          ? item.price.product 
          : item.price.product.id
        
        const product = await stripe.products.retrieve(productId)
        
        // Determine the tier from product metadata or use 'basic' as fallback
        const tier = (tierFromMetadata || product.metadata.tier || 'basic') as SubscriptionTier
        
        // Determine the interval from the price
        const interval = item.price.recurring?.interval as SubscriptionInterval || 'month'
        
        // Update the subscription in the database
        const { error: updateError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            tier,
            interval,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            // Set appropriate usage limits based on tier
            usage_limits: getUsageLimits(tier)
          })
        
        if (updateError) {
          console.error('Error updating subscription:', updateError)
        } else {
          console.log(`Successfully updated subscription for user ${userId} to ${tier} tier`)
        }
        
        break
      }
      
      // When subscription is updated
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get customer ID
        const customerId = subscription.customer as string
        
        // Find the user by customer ID
        const { data: userSubscription, error: findError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()
        
        if (findError || !userSubscription) {
          console.error('Error finding user by customer ID:', findError)
          return NextResponse.json({ received: true })
        }
        
        const userId = userSubscription.user_id
        
        // Get the tier from metadata or determine from the product
        const tierFromMetadata = subscription.metadata.tier as SubscriptionTier | undefined
        
        // Get the first item in the subscription
        const item = subscription.items.data[0]
        if (!item || !item.price || !item.price.product) {
          throw new Error('No price or product found in subscription')
        }
        
        // Retrieve the product to get its metadata
        const productId = typeof item.price.product === 'string' 
          ? item.price.product 
          : item.price.product.id
        
        const product = await stripe.products.retrieve(productId)
        
        // Determine the tier from product metadata or use current tier as fallback
        const tier = (tierFromMetadata || product.metadata.tier || 'basic') as SubscriptionTier
        
        // Determine the interval from the price
        const interval = item.price.recurring?.interval as SubscriptionInterval || 'month'
        
        // Update the subscription in the database
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            tier,
            interval,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            usage_limits: getUsageLimits(tier)
          })
          .eq('user_id', userId)
        
        if (updateError) {
          console.error('Error updating subscription:', updateError)
        } else {
          console.log(`Successfully updated subscription for user ${userId}`)
        }
        
        break
      }
      
      // When subscription is cancelled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get customer ID
        const customerId = subscription.customer as string
        
        // Find the user by customer ID
        const { data: userSubscription, error: findError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()
        
        if (findError || !userSubscription) {
          console.error('Error finding user by customer ID:', findError)
          return NextResponse.json({ received: true })
        }
        
        const userId = userSubscription.user_id
        
        // Update the subscription to free tier
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            tier: 'free',
            status: 'canceled',
            usage_limits: getUsageLimits('free')
          })
          .eq('user_id', userId)
        
        if (updateError) {
          console.error('Error downgrading subscription to free tier:', updateError)
        } else {
          console.log(`Successfully downgraded subscription for user ${userId} to free tier`)
        }
        
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper function to get usage limits based on tier
function getUsageLimits(tier: SubscriptionTier) {
  switch (tier) {
    case 'pro':
      return {
        chat_messages: -1, // Unlimited
        teach_back_sessions: -1, // Unlimited
        auto_flashcards_enabled: true
      }
    case 'basic':
      return {
        chat_messages: 50,
        teach_back_sessions: 50,
        auto_flashcards_enabled: true
      }
    case 'free':
    default:
      return {
        chat_messages: 10,
        teach_back_sessions: 10,
        auto_flashcards_enabled: false
      }
  }
} 