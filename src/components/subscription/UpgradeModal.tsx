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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade to Continue</DialogTitle>
          <DialogDescription>
            You've used {currentUsage} out of {limit} {featureLabels[feature]} this month.
            Upgrade to get more {featureLabels[feature]} and unlock additional features!
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-900">Basic Plan - $9.99/month</h3>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li>• 50 {featureLabels[feature]} per month</li>
                <li>• Auto-generate flashcards</li>
                <li>• All free features included</li>
              </ul>
              <Button
                className="mt-3 w-full bg-blue-500 hover:bg-blue-600"
                onClick={() => handleUpgrade('basic')}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Upgrade to Basic'}
              </Button>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <h3 className="font-semibold text-purple-900">Pro Plan - $19.99/month</h3>
              <ul className="mt-2 space-y-1 text-sm text-purple-700">
                <li>• Unlimited {featureLabels[feature]}</li>
                <li>• Priority support</li>
                <li>• All Basic features included</li>
              </ul>
              <Button
                className="mt-3 w-full bg-purple-500 hover:bg-purple-600"
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