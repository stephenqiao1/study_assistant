'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

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
    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {/* Free Plan */}
      <div className="relative p-6 bg-[#12141f] rounded-2xl border border-[#2d2b55] hover:border-[#6366F1]/50 transition-all">
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-gray-100">Free</h3>
          <p className="text-gray-400 mt-2">Perfect for trying out our features</p>
        </div>
        
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-bold text-gray-100">$0</span>
          <span className="text-gray-400">/mo</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-[#8B5CF6]">
              <span className="font-medium">10</span>
            </div>
            <span className="text-gray-300 text-sm">Teach-back sessions per month</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-[#8B5CF6]">
              <span className="font-medium">10</span>
            </div>
            <span className="text-gray-300 text-sm">Virtual student chat messages</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-[#8B5CF6]">
              <span className="font-medium">Basic</span>
            </div>
            <span className="text-gray-300 text-sm">YouTube video search</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-gray-500 text-sm">Auto-generate flashcards</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-gray-500 text-sm">Formula sheet extraction</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center">
              <Check className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <span className="text-gray-300 text-sm">Spaced repetition system</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center">
              <Check className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <span className="text-gray-300 text-sm">Voice recording & transcription</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-gray-500 text-sm">Priority support</span>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full border-[#2d2b55] hover:border-[#6366F1] hover:bg-[#1a1c2e] text-gray-100">
              Current Plan
            </Button>
          </Link>
        </div>
      </div>

      {/* Basic Plan */}
      <div className="relative p-6 bg-[#12141f] rounded-2xl border border-[#6366F1] hover:border-[#8B5CF6] transition-all">
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] text-white text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap">
            Most Popular
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-2xl font-bold text-gray-100">Basic</h3>
          <p className="text-gray-400 mt-2">Perfect for regular learners</p>
        </div>
        
        <div className="flex items-baseline gap-1 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-gray-100">$2.00</span>
            <div className="px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
              -80%
            </div>
          </div>
          <span className="text-gray-400">/month</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-[#8B5CF6]">
              <span className="font-medium">50</span>
            </div>
            <span className="text-gray-300 text-sm">Teach-back sessions per month</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-[#8B5CF6]">
              <span className="font-medium">50</span>
            </div>
            <span className="text-gray-300 text-sm">Virtual student chat messages</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-[#8B5CF6]">
              <span className="font-medium text-sm">Enhanced</span>
            </div>
            <span className="text-gray-300 text-sm">YouTube video search</span>
          </div>
          
          {features.slice(3).map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center">
                {feature.basic ? (
                  <Check className="w-5 h-5 text-[#8B5CF6]" />
                ) : (
                  <X className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <span className={`text-sm ${feature.basic ? 'text-gray-300' : 'text-gray-500'}`}>
                {feature.name}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/login" className="w-full">
            <Button className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:opacity-90 transition-opacity text-white">
              Get Basic Plan
            </Button>
          </Link>
        </div>
      </div>

      {/* Pro Plan */}
      <div className="relative p-6 bg-[#12141f] rounded-2xl border border-[#2d2b55] hover:border-[#6366F1]/50 transition-all">
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-gray-100">Pro</h3>
          <p className="text-gray-400 mt-2">Perfect for power users</p>
        </div>
        
        <div className="flex items-baseline gap-1 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-gray-100">$4.00</span>
            <div className="px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
              -80%
            </div>
          </div>
          <span className="text-gray-400">/month</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-[#8B5CF6]">
              <span className="font-medium text-sm">Unlimited</span>
            </div>
            <span className="text-gray-300 text-sm">Teach-back sessions per month</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-[#8B5CF6]">
              <span className="font-medium text-sm">Unlimited</span>
            </div>
            <span className="text-gray-300 text-sm">Virtual student chat messages</span>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-[#8B5CF6]">
              <span className="font-medium text-sm">AI</span>
            </div>
            <span className="text-gray-300 text-sm">YouTube video search</span>
          </div>
          
          {features.slice(3).map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center">
                {feature.pro ? (
                  <Check className="w-5 h-5 text-[#8B5CF6]" />
                ) : (
                  <X className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <span className={`text-sm ${feature.pro ? 'text-gray-300' : 'text-gray-500'}`}>
                {feature.name}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/login" className="w-full">
            <Button className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:opacity-90 transition-opacity text-white">
              Get Pro Plan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 