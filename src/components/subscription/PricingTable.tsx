'use client'

import { useState, useEffect } from 'react'
import { Check, X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { UserSubscription } from '@/utils/subscription'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

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
  const [_billingInterval, _setBillingInterval] = useState<'month' | 'year'>('month')
  const [_isLoading, setIsLoading] = useState(false)
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  const _router = useRouter()
  const { session: _session } = useAuth()
  const supabase = createClientComponentClient<Database>()

  // Fetch user's subscription when component mounts or session changes
  useEffect(() => {
    async function fetchSubscription() {
      if (!_session?.user) {
        console.log("No user session found");
        setSubscription(null)
        setIsLoadingSubscription(false)
        return
      }

      try {
        // Enhanced debugging for user ID
        const userId = _session.user.id;
        console.log("==========================================");
        console.log("SUBSCRIPTION DEBUG:");
        console.log(`User ID: ${userId}`);
        console.log(`User ID Type: ${typeof userId}`);
        console.log(`User ID Length: ${userId.length}`);
        
        // Log additional user info if available
        if (_session.user.email) {
          console.log(`User Email: ${_session.user.email}`);
        }
        
        // Try a raw query with the exact ID to check formatting
        const rawQuery = `user_id=eq.${userId}`;
        console.log(`Raw query string: ${rawQuery}`);
        
        // Try a server-side API route to fetch subscription data (bypassing RLS)
        console.log("Attempting to fetch subscription via server API...");
        let apiResponse = null;
        
        try {
          const response = await fetch(`/api/subscription?userId=${userId}`);
          apiResponse = await response.json();
          console.log("Server API response:", apiResponse);
        } catch (apiError) {
          console.error("Error fetching from API:", apiError);
        }
        
        if (apiResponse && apiResponse.subscription) {
          console.log("Successfully fetched subscription from API");
          handleSubscriptionData(apiResponse.subscription);
        } else {
          console.log("API failed or returned no data, falling back to direct query...");
          
          // First try to get just the count to verify data exists
          const { count, error: countError } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
            
          console.log(`Count result: ${count}`, "Count error:", countError);
          
          // Log the RLS policies by trying another approach
          console.log("Attempting direct subscription query...");
          const { data: allUserSubscriptions, error: listError } = await supabase
            .from('subscriptions')
            .select('id, user_id, tier, status')
            .limit(10);
            
          console.log("All accessible subscriptions:", allUserSubscriptions);
          console.log("List error:", listError);
          
          // If no records or error getting count, try to fetch with .maybeSingle() instead of .single()
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          console.log("Subscription fetch result:", data);
          console.log("Subscription fetch error:", error);
          
          if (error) {
            console.error('Error fetching subscription:', error)
            setSubscription(null);
          } else if (data) {
            // Use the data from direct query
            handleSubscriptionData(data);
          } else {
            // Create a default free subscription
            console.log("No subscription found via direct query, using default free tier");
            setDefaultSubscription();
          }
        }
        
        console.log("==========================================");
      } catch (error) {
        console.error('Error fetching subscription:', error)
        // Create a default free subscription if an error occurs
        setDefaultSubscription();
      } finally {
        setIsLoadingSubscription(false)
      }
    }
    
    // Helper function to handle subscription data
    function handleSubscriptionData(data: Database['public']['Tables']['subscriptions']['Row']) {
      // Check if subscription is active
      const isActive = data.status === 'active' || data.status === 'trialing'
      const isSubscribed = data.tier !== 'free' && isActive

      setSubscription({
        tier: data.tier,
        status: data.status,
        interval: data.interval,
        isActive,
        isSubscribed,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end
      })

      // Set billing interval to match current subscription
      if (data.interval) {
        _setBillingInterval(data.interval as 'month' | 'year')
      }
    }
    
    // Helper function to set default free subscription
    function setDefaultSubscription() {
      setSubscription({
        tier: 'free',
        status: 'inactive',
        isActive: false,
        isSubscribed: false
      });
    }

    fetchSubscription()
  }, [_session, supabase])

  const _handleUpgrade = async (tier: 'basic' | 'pro') => {
    setIsLoading(true)

    try {
      // Check if user is logged in
      if (!_session?.user) {
        // Redirect to login page if not authenticated
        _router.push('/login')
        return
      }

      // User is authenticated, proceed with checkout
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tier,
          interval: _billingInterval,
          returnUrl: `${window.location.origin}/pricing`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { sessionId } = await response.json()

      // Load Stripe and redirect to checkout
      const { getStripe } = await import('@/utils/stripe-client')
      const stripe = await getStripe()
      
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      }
    } catch (error) {
      console.error('Checkout error:', error)
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to render the appropriate button based on subscription status
  const renderPlanButton = (tier: 'free' | 'basic' | 'pro') => {
    // Show loading state
    if (isLoadingSubscription) {
      return (
        <Button disabled className="w-full">
          Loading...
        </Button>
      )
    }

    // If user is not logged in, show login button for all plans
    if (!_session?.user) {
      return (
        <Link href="/login" className="w-full">
          <Button variant={tier === 'free' ? 'outline' : 'default'} className={`w-full ${tier !== 'free' ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}`}>
            {tier === 'free' ? 'Sign Up for Free' : `Get ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`}
          </Button>
        </Link>
      )
    }

    // Check if this is the current plan
    const isCurrentPlan = subscription?.tier === tier && subscription?.isActive

    // If it's the current plan, show "Current Plan" button
    if (isCurrentPlan) {
      const renewalDate = subscription?.currentPeriodEnd 
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString() 
        : 'N/A'
        
      const willCancel = subscription?.cancelAtPeriodEnd ? ' (Cancels on ' + renewalDate + ')' : ''
      
      return (
        <Button 
          variant={tier === 'free' ? 'outline' : 'default'} 
          className={`w-full ${tier !== 'free' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:opacity-90' : ''}`} 
          onClick={_handleManageSubscription}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {subscription?.cancelAtPeriodEnd ? 'Renew Subscription' : 'Manage Subscription'}{willCancel}
        </Button>
      )
    }

    // For other plans, show upgrade/downgrade button
    if (tier === 'free') {
      // If they have a paid subscription, manage through Stripe portal
      if (subscription?.isSubscribed) {
        return (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={_handleManageSubscription}
            disabled={_isLoading}
          >
            {_isLoading ? 'Processing...' : 'Manage Subscription'}
          </Button>
        )
      }
      
      // Otherwise show current plan for free
      return (
        <Button 
          variant="outline" 
          className="w-full" 
          disabled={true}
        >
          Current Plan
        </Button>
      )
    } else {
      return (
        <Button 
          className={`w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-primary-foreground`}
          onClick={() => _handleUpgrade(tier)}
          disabled={_isLoading}
        >
          {_isLoading ? 'Loading...' : `Get ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`}
        </Button>
      )
    }
  }

  // Handle redirecting to Stripe Customer Portal to manage subscription
  const _handleManageSubscription = async () => {
    // Direct link to Stripe Customer Portal
    window.location.href = "https://billing.stripe.com/p/login/aEU9Db20F76l9Ve9AA";
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Billing Interval Toggle */}
      <div className="flex items-center gap-4">
        <span className={`text-sm ${_billingInterval === 'month' ? 'text-card-foreground' : 'text-muted-foreground'}`}>
          Monthly
        </span>
        <button
          onClick={() => _setBillingInterval(_billingInterval === 'month' ? 'year' : 'month')}
          className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <span
            className={`${
              _billingInterval === 'year' ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-primary transition-transform`}
          />
        </button>
        <span className={`text-sm ${_billingInterval === 'year' ? 'text-card-foreground' : 'text-muted-foreground'}`}>
          Yearly
          {_billingInterval === 'year' && (
            <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Save 17%
            </span>
          )}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Free Plan */}
        <div className={`relative p-6 bg-card rounded-2xl border ${subscription?.tier === 'free' ? 'border-green-500 ring-1 ring-green-500' : 'border-border hover:border-primary/50'} transition-all`}>
          {subscription?.tier === 'free' && (
            <div className="absolute -top-3 right-3">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap">
                Current Plan
              </div>
            </div>
          )}
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-card-foreground">Free</h3>
            <p className="text-muted-foreground mt-2">Perfect for trying out our features</p>
          </div>
          
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold text-card-foreground">$0</span>
            <span className="text-muted-foreground">/{_billingInterval}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="font-medium">10</span>
              </div>
              <span className="text-card-foreground text-sm">Teach-back sessions per month</span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="font-medium">10</span>
              </div>
              <span className="text-card-foreground text-sm">Virtual student chat messages</span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="font-medium">Basic</span>
              </div>
              <span className="text-card-foreground text-sm">YouTube video search</span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center">
                <X className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground text-sm">Auto-generate flashcards</span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center">
                <X className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground text-sm">Formula sheet extraction</span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <span className="text-card-foreground text-sm">Spaced repetition system</span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <span className="text-card-foreground text-sm">Voice recording & transcription</span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center">
                <X className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground text-sm">Priority support</span>
            </div>
          </div>

          <div className="mt-8">
            {renderPlanButton('free')}
          </div>
        </div>

        {/* Basic Plan */}
        <div className={`relative p-6 bg-card rounded-2xl border ${subscription?.tier === 'basic' ? 'border-green-500 ring-1 ring-green-500' : subscription?.tier === 'free' ? 'border-primary hover:border-primary/80' : 'border-border hover:border-primary/50'} transition-all`}>
          {subscription?.tier !== 'basic' && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap">
                Most Popular
              </div>
            </div>
          )}
          {subscription?.tier === 'basic' && (
            <div className="absolute -top-3 right-3">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap">
                Current Plan
              </div>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-2xl font-bold text-card-foreground">Basic</h3>
            <p className="text-muted-foreground mt-2">Perfect for regular learners</p>
          </div>
          
          <div className="flex items-baseline gap-1 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold text-card-foreground">
                ${_billingInterval === 'month' ? '2.00' : '19.99'}
              </span>
              <div className="px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
                -80%
              </div>
            </div>
            <span className="text-muted-foreground">/{_billingInterval}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="font-medium">50</span>
              </div>
              <span className="text-card-foreground text-sm">Teach-back sessions per month</span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="font-medium">50</span>
              </div>
              <span className="text-card-foreground text-sm">Virtual student chat messages</span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="font-medium text-sm">Enhanced</span>
              </div>
              <span className="text-card-foreground text-sm">YouTube video search</span>
            </div>
            
            {features.slice(3).map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-12 flex-shrink-0 flex items-center justify-center">
                  {feature.basic ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-sm ${feature.basic ? 'text-card-foreground' : 'text-muted-foreground'}`}>
                  {feature.name}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            {renderPlanButton('basic')}
          </div>
        </div>

        {/* Pro Plan */}
        <div className={`relative p-6 bg-card rounded-2xl border ${subscription?.tier === 'pro' ? 'border-green-500 ring-1 ring-green-500' : 'border-border hover:border-primary/50'} transition-all`}>
          {subscription?.tier === 'pro' && (
            <div className="absolute -top-3 right-3">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap">
                Current Plan
              </div>
            </div>
          )}
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-card-foreground">Pro</h3>
            <p className="text-muted-foreground mt-2">Perfect for power users</p>
          </div>
          
          <div className="flex items-baseline gap-1 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold text-card-foreground">
                ${_billingInterval === 'month' ? '4.00' : '39.99'}
              </span>
              <div className="px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
                -80%
              </div>
            </div>
            <span className="text-muted-foreground">/{_billingInterval}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="font-medium text-sm">Unlimited</span>
              </div>
              <span className="text-card-foreground text-sm">Teach-back sessions per month</span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="font-medium text-sm">Unlimited</span>
              </div>
              <span className="text-card-foreground text-sm">Virtual student chat messages</span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-12 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="font-medium text-sm">AI</span>
              </div>
              <span className="text-card-foreground text-sm">YouTube video search</span>
            </div>
            
            {features.slice(3).map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-12 flex-shrink-0 flex items-center justify-center">
                  {feature.pro ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-sm ${feature.pro ? 'text-card-foreground' : 'text-muted-foreground'}`}>
                  {feature.name}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            {renderPlanButton('pro')}
          </div>
        </div>
      </div>
    </div>
  )
} 