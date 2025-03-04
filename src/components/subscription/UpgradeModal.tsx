import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useRequireAuth } from '@/hooks/useRequireAuth'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature: 'teach_back'
  currentUsage: number
  limit: number
}

const featureLabels = {
  teach_back: 'teach-back sessions'
}

export function UpgradeModal({ isOpen, onClose, feature, currentUsage, limit }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { session } = useRequireAuth()

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background dark:bg-background-card/95 border border-border shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-text dark:text-white">Upgrade to Continue</DialogTitle>
          <DialogDescription className="text-text-light dark:text-gray-300">
            You've used {currentUsage} out of {limit} {featureLabels[feature]} this month.
            Upgrade to get more {featureLabels[feature]} and unlock additional features!
          </DialogDescription>
        </DialogHeader>
        
        {/* Special Promotion Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white p-3 rounded-lg mb-4">
          <div className="text-center">
            <p className="font-bold">🎉 Limited Time Offer! 🎉</p>
            <p className="text-sm">Save <span className="font-bold">80%</span> on all plans - only for the first 100 users!</p>
            <p className="text-xs mt-1">Discount automatically applied at checkout</p>
          </div>
        </div>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            {/* Basic Plan - Light & Dark Mode Compatible */}
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-700">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300">Basic Plan</h3>
              <div className="flex items-center mt-1">
                <span className="relative text-blue-900 dark:text-blue-200 font-bold text-lg">
                  <span className="line-through opacity-70">$9.99/month</span>
                  <span className="absolute -top-3.5 right-0 text-xs text-red-500 dark:text-red-400 font-normal">-80%</span>
                </span>
                <span className="ml-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Limited Offer
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-0.5 font-semibold">You pay: $1.99/month</p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li>• 50 {featureLabels[feature]} per month</li>
                <li>• Auto-generate flashcards</li>
                <li>• All free features included</li>
              </ul>
              <Button
                className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => handleUpgrade('basic')}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Upgrade to Basic'}
              </Button>
            </div>
            
            {/* Pro Plan - Light & Dark Mode Compatible */}
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-100 dark:border-purple-700">
              <h3 className="font-semibold text-purple-900 dark:text-purple-300">Pro Plan</h3>
              <div className="flex items-center mt-1">
                <span className="relative text-purple-900 dark:text-purple-200 font-bold text-lg">
                  <span className="line-through opacity-70">$19.99/month</span>
                  <span className="absolute -top-3.5 right-0 text-xs text-red-500 dark:text-red-400 font-normal">-80%</span>
                </span>
                <span className="ml-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Limited Offer
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-0.5 font-semibold">You pay: $3.99/month</p>
              <ul className="mt-2 space-y-1 text-sm text-purple-700 dark:text-purple-300">
                <li>• Unlimited {featureLabels[feature]}</li>
                <li>• Priority support</li>
                <li>• All Basic features included</li>
              </ul>
              <Button
                className="mt-3 w-full bg-purple-500 hover:bg-purple-600 text-white"
                onClick={() => handleUpgrade('pro')}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Upgrade to Pro'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 