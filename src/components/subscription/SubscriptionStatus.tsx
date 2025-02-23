import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useUsageLimits } from '@/hooks/useUsageLimits'

export function SubscriptionStatus() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { session } = useRequireAuth()
  const { 
    teach_back: teachBackUsage,
    auto_flashcards_enabled: hasAutoFlashcards,
    isLoading: isLoadingUsage
  } = useUsageLimits()

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
          interval: 'month',
          returnUrl: `${window.location.origin}/pricing`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
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

  if (isLoadingUsage) {
    return <div>Loading subscription status...</div>
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Subscription & Usage</h2>
      
      {/* Current Plan */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500">Current Plan</h3>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">
              {teachBackUsage.limit === -1 ? 'Pro' : 
               teachBackUsage.limit === 50 ? 'Basic' : 'Free'} Plan
            </p>
            <p className="text-sm text-gray-500">
              {teachBackUsage.limit === -1 ? 'Unlimited access to all features' :
               teachBackUsage.limit === 50 ? 'Extended access to key features' :
               'Limited access to basic features'}
            </p>
          </div>
          {teachBackUsage.limit !== -1 && (
            <Button
              onClick={() => handleUpgrade(teachBackUsage.limit === 50 ? 'pro' : 'basic')}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Upgrade'}
            </Button>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Teach-Back Sessions</span>
            <span className="text-sm text-gray-500">
              {teachBackUsage.current} / {teachBackUsage.limit === -1 ? '∞' : teachBackUsage.limit}
            </span>
          </div>
          <Progress 
            value={teachBackUsage.limit === -1 ? 0 : (teachBackUsage.current / teachBackUsage.limit) * 100} 
            className="h-2"
            indicatorClassName={teachBackUsage.isLimited ? 'bg-red-500' : undefined}
          />
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Additional Features</h4>
          <div className="flex items-center text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full mr-2 ${hasAutoFlashcards ? 'bg-green-500' : 'bg-gray-300'}`} />
            Auto-generate flashcards {hasAutoFlashcards ? '(Enabled)' : '(Upgrade to enable)'}
          </div>
        </div>
      </div>
    </Card>
  )
} 