'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface PricingFeature {
  name: string
  free: boolean | string
  basic: boolean | string
  pro: boolean | string
}

const features: PricingFeature[] = [
  {
    name: 'Teach-back sessions per month',
    free: '10',
    basic: '50',
    pro: 'Unlimited'
  },
  {
    name: 'Virtual student chat messages',
    free: '10',
    basic: '50',
    pro: 'Unlimited'
  },
  {
    name: 'YouTube video search',
    free: 'Basic',
    basic: 'Enhanced',
    pro: 'AI-powered'
  },
  {
    name: 'Auto-generate flashcards',
    free: false,
    basic: true,
    pro: true
  },
  {
    name: 'Formula sheet extraction',
    free: false,
    basic: true,
    pro: true
  },
  {
    name: 'Spaced repetition system',
    free: true,
    basic: true,
    pro: true
  },
  {
    name: 'Voice recording & transcription',
    free: true,
    basic: true,
    pro: true
  },
  {
    name: 'Priority support',
    free: false,
    basic: false,
    pro: true
  }
]

export default function PricingTable() {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')
  const [isLoading, setIsLoading] = useState(false)
  const _router = useRouter()
  const { session: _session } = useAuth()

  const prices = {
    basic: {
      month: 9.99,
      year: 99.99
    },
    pro: {
      month: 19.99,
      year: 199.99
    }
  }

  const handleUpgrade = async (tier: 'basic' | 'pro') => {
    setIsLoading(true)

    try {
      // Create a guest checkout session that doesn't require login
      const response = await fetch('/api/stripe/guest-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tier,
          interval: billingInterval,
          returnUrl: `${window.location.origin}/pricing`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()

      // Load Stripe and redirect to checkout
      const { getStripe } = await import('@/utils/stripe-client')
      const stripe = await getStripe()
      
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      }
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Error handling without console.log
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-16 flex flex-col items-center">
      {/* Special Promotion Banner */}
      <div className="w-full max-w-4xl mb-8 bg-gradient-to-r from-purple-600 to-blue-500 text-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold mb-2">🎉 Special Launch Promotion! 🎉</h2>
          <p className="text-lg mb-1">Get <span className="font-bold text-xl">80% OFF</span> all plans for the first 100 users!</p>
          <p className="text-sm opacity-90">Limited time offer - Discount automatically applied at checkout</p>
        </div>
      </div>

      {/* Billing interval toggle */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant={billingInterval === 'month' ? 'default' : 'outline'}
          onClick={() => setBillingInterval('month')}
        >
          Monthly
        </Button>
        <Button
          variant={billingInterval === 'year' ? 'default' : 'outline'}
          onClick={() => setBillingInterval('year')}
        >
          Yearly
          <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600">
            Save 17%
          </span>
        </Button>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Free tier */}
        <Card className="flex flex-col p-8">
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-text dark:text-white">Free</h3>
            <p className="mt-4 text-text-light dark:text-gray-300">Perfect for trying out our features</p>
            <p className="mt-6">
              <span className="text-4xl font-bold text-text dark:text-white">$0</span>
              <span className="text-text-light dark:text-gray-300">/mo</span>
            </p>
          </div>
          <ul className="mb-8 space-y-4 flex-1">
            {features.map((feature) => (
              <li key={feature.name} className="flex items-center gap-3">
                {typeof feature.free === 'boolean' ? (
                  feature.free ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                  )
                ) : (
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {feature.free}
                  </span>
                )}
                <span className="text-text-light dark:text-gray-300">{feature.name}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        </Card>

        {/* Basic tier */}
        <Card className="flex flex-col p-8 relative border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-900/30">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Most Popular
            </span>
          </div>
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-text dark:text-white">Basic</h3>
            <p className="mt-4 text-text-light dark:text-gray-300">Perfect for regular learners</p>
            <p className="mt-6 flex items-center">
              <span className="text-4xl font-bold text-text dark:text-white">
                ${prices.basic[billingInterval]}
              </span>
              <span className="text-text-light dark:text-gray-300">/{billingInterval}</span>
              <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                80% OFF
              </span>
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              You pay: ${(prices.basic[billingInterval] * 0.2).toFixed(2)}
            </p>
          </div>
          <ul className="mb-8 space-y-4 flex-1">
            {features.map((feature) => (
              <li key={feature.name} className="flex items-center gap-3">
                {typeof feature.basic === 'boolean' ? (
                  feature.basic ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                  )
                ) : (
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {feature.basic}
                  </span>
                )}
                <span className="text-text-light dark:text-gray-300">{feature.name}</span>
              </li>
            ))}
          </ul>
          <Button 
            className="w-full" 
            onClick={() => handleUpgrade('basic')}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Get Basic Plan'}
          </Button>
        </Card>

        {/* Pro tier */}
        <Card className="flex flex-col p-8 border-purple-200 bg-purple-50/50 dark:bg-purple-900/20 dark:border-purple-900/30">
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-text dark:text-white">Pro</h3>
            <p className="mt-4 text-text-light dark:text-gray-300">Perfect for power users</p>
            <p className="mt-6 flex items-center">
              <span className="text-4xl font-bold text-text dark:text-white">
                ${prices.pro[billingInterval]}
              </span>
              <span className="text-text-light dark:text-gray-300">/{billingInterval}</span>
              <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                80% OFF
              </span>
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              You pay: ${(prices.pro[billingInterval] * 0.2).toFixed(2)}
            </p>
          </div>
          <ul className="mb-8 space-y-4 flex-1">
            {features.map((feature) => (
              <li key={feature.name} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {typeof feature.pro === 'boolean' ? (
                    feature.pro ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                    )
                  ) : (
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {feature.pro}
                    </span>
                  )}
                </div>
                <span className="text-text-light dark:text-gray-300 text-sm">{feature.name}</span>
              </li>
            ))}
          </ul>
          <Button 
            className="w-full" 
            onClick={() => handleUpgrade('pro')}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Get Pro Plan'}
          </Button>
        </Card>
      </div>
    </div>
  )
} 