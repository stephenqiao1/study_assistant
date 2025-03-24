import { NextResponse } from 'next/server'
import { SUBSCRIPTION_PRICES } from '@/utils/stripe'

export async function GET() {
  try {
    // Check if the price IDs are configured
    const prices = {
      basic: {
        month: Boolean(SUBSCRIPTION_PRICES.basic.month),
        year: Boolean(SUBSCRIPTION_PRICES.basic.year)
      },
      pro: {
        month: Boolean(SUBSCRIPTION_PRICES.pro.month),
        year: Boolean(SUBSCRIPTION_PRICES.pro.year)
      }
    }

    // Create a diagnostics object to help with debugging
    const diagnostics = {
      basic_month: SUBSCRIPTION_PRICES.basic.month || 'Not configured',
      basic_year: SUBSCRIPTION_PRICES.basic.year || 'Not configured',
      pro_month: SUBSCRIPTION_PRICES.pro.month || 'Not configured',
      pro_year: SUBSCRIPTION_PRICES.pro.year || 'Not configured',
      env_vars_set: Boolean(
        process.env.STRIPE_SECRET_KEY &&
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      )
    }

    return NextResponse.json({ 
      prices,
      diagnostics,
      allConfigured: Object.values(prices).every(tierPrices => 
        Object.values(tierPrices).every(Boolean)
      )
    })
  } catch (error) {
    console.error('Error checking Stripe prices:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check Stripe prices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 