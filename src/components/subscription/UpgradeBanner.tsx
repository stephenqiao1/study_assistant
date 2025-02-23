import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { ArrowRight, X } from 'lucide-react'

interface UpgradeBannerProps {
  type?: 'dashboard' | 'study'
}

export function UpgradeBanner({ type = 'dashboard' }: UpgradeBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { session } = useAuth()

  const handleUpgrade = async () => {
    // For study page, just navigate to pricing
    if (type === 'study') {
      router.push('/pricing')
      return
    }

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
          tier: 'basic',
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

  if (!isVisible) return null

  return (
    <div className={`relative ${type === 'dashboard' ? 'mb-8' : 'mb-4'} rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 p-6 shadow-sm`}>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-2 text-gray-400 hover:text-gray-500"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {type === 'dashboard' 
              ? 'Unlock Advanced Features'
              : 'Get Unlimited Study Sessions'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {type === 'dashboard'
              ? 'Upgrade to Basic or Pro for unlimited usage, auto-generated flashcards, and more!'
              : 'Upgrade to continue your learning journey without limits.'}
          </p>
        </div>
        <div className="ml-4">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading && type !== 'study' ? (
              'Loading...'
            ) : (
              <>
                {type === 'study' ? 'View Plans' : 'Upgrade Now'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 