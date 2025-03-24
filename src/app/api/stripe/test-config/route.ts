import { NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe'

export async function GET() {
  try {
    // Check if Stripe is properly initialized
    const stripeTest = await stripe.balance.retrieve()
    
    // Check environment variables
    const envVars = {
      hasPublishableKey: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
      hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      hasBasicMonthlyPrice: Boolean(process.env.STRIPE_BASIC_MONTHLY_PRICE_ID),
      hasBasicYearlyPrice: Boolean(process.env.STRIPE_BASIC_YEARLY_PRICE_ID),
      hasProMonthlyPrice: Boolean(process.env.STRIPE_PRO_MONTHLY_PRICE_ID),
      hasProYearlyPrice: Boolean(process.env.STRIPE_PRO_YEARLY_PRICE_ID),
    }

    return NextResponse.json({
      status: 'ok',
      stripeInitialized: Boolean(stripeTest),
      environmentVariables: envVars,
      allConfigured: Object.values(envVars).every(Boolean)
    })
  } catch (error) {
    console.error('Stripe configuration test failed:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      environmentVariables: {
        hasPublishableKey: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
        hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
        hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        hasBasicMonthlyPrice: Boolean(process.env.STRIPE_BASIC_MONTHLY_PRICE_ID),
        hasBasicYearlyPrice: Boolean(process.env.STRIPE_BASIC_YEARLY_PRICE_ID),
        hasProMonthlyPrice: Boolean(process.env.STRIPE_PRO_MONTHLY_PRICE_ID),
        hasProYearlyPrice: Boolean(process.env.STRIPE_PRO_YEARLY_PRICE_ID),
      }
    }, { status: 500 })
  }
} 