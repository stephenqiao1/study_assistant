'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TIER_LIMITS } from '@/utils/stripe'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
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
    name: 'Auto-generate flashcards',
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
  const router = useRouter()
  const { session } = useAuth()

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
    if (!session?.user?.id) {
      router.push('/login')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
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
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-16 flex flex-col items-center">
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
            <h3 className="text-xl font-semibold text-text">Free</h3>
            <p className="mt-4 text-text-light">Perfect for trying out our features</p>
            <p className="mt-6">
              <span className="text-4xl font-bold text-text">$0</span>
              <span className="text-text-light">/mo</span>
            </p>
          </div>
          <ul className="mb-8 space-y-4 flex-1">
            {features.map((feature) => (
              <li key={feature.name} className="flex items-center gap-3">
                {typeof feature.free === 'boolean' ? (
                  feature.free ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300" />
                  )
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center font-medium text-green-600">
                    {feature.free}
                  </span>
                )}
                <span className="text-text-light">{feature.name}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        </Card>

        {/* Basic tier */}
        <Card className="flex flex-col p-8 relative border-blue-200 bg-blue-50/50">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Most Popular
            </span>
          </div>
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-text">Basic</h3>
            <p className="mt-4 text-text-light">Perfect for regular learners</p>
            <p className="mt-6">
              <span className="text-4xl font-bold text-text">
                ${prices.basic[billingInterval]}
              </span>
              <span className="text-text-light">/{billingInterval}</span>
            </p>
          </div>
          <ul className="mb-8 space-y-4 flex-1">
            {features.map((feature) => (
              <li key={feature.name} className="flex items-center gap-3">
                {typeof feature.basic === 'boolean' ? (
                  feature.basic ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300" />
                  )
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center font-medium text-green-600">
                    {feature.basic}
                  </span>
                )}
                <span className="text-text-light">{feature.name}</span>
              </li>
            ))}
          </ul>
          <Button 
            className="w-full" 
            onClick={() => handleUpgrade('basic')}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Upgrade to Basic'}
          </Button>
        </Card>

        {/* Pro tier */}
        <Card className="flex flex-col p-8 border-purple-200 bg-purple-50/50">
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-text">Pro</h3>
            <p className="mt-4 text-text-light">Perfect for power users</p>
            <p className="mt-6">
              <span className="text-4xl font-bold text-text">
                ${prices.pro[billingInterval]}
              </span>
              <span className="text-text-light">/{billingInterval}</span>
            </p>
          </div>
          <ul className="mb-8 space-y-4 flex-1">
            {features.map((feature) => (
              <li key={feature.name} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1 w-16">
                  {typeof feature.pro === 'boolean' ? (
                    feature.pro ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300" />
                    )
                  ) : (
                    <span className="text-sm font-medium text-green-600">
                      {feature.pro}
                    </span>
                  )}
                </div>
                <span className="text-text-light text-sm">{feature.name}</span>
              </li>
            ))}
          </ul>
          <Button 
            className="w-full" 
            onClick={() => handleUpgrade('pro')}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Upgrade to Pro'}
          </Button>
        </Card>
      </div>
    </div>
  )
} 