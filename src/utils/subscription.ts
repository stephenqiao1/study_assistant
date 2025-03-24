import { SupabaseClient } from '@supabase/supabase-js'
import { Database, SubscriptionTier } from '@/types/supabase'

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused' | 'inactive'
export type SubscriptionInterval = 'month' | 'year'

export interface UserSubscription {
  tier: SubscriptionTier
  status: SubscriptionStatus
  interval?: SubscriptionInterval
  isActive: boolean
  isSubscribed: boolean
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
}

/**
 * Get a user's subscription details
 */
export async function getUserSubscription(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserSubscription> {
  // Default to free tier
  const defaultSubscription: UserSubscription = {
    tier: 'free',
    status: 'inactive',
    isActive: false,
    isSubscribed: false
  }

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return defaultSubscription
    }

    // Check if subscription is active
    const isActive = data.status === 'active' || data.status === 'trialing'
    
    // User is subscribed if they have a tier other than free
    const isSubscribed = data.tier !== 'free' && isActive

    return {
      tier: data.tier as SubscriptionTier || 'free',
      status: (data.status as SubscriptionStatus) || 'inactive',
      interval: data.interval as SubscriptionInterval,
      isActive,
      isSubscribed,
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end
    }
  } catch (error) {
    console.error('Error getting subscription:', error)
    return defaultSubscription
  }
}

/**
 * Check if a user has access to a specific feature
 */
export function hasFeatureAccess(
  subscription: UserSubscription,
  feature: string
): boolean {
  // If the user doesn't have an active subscription, they only have access to free tier features
  if (!subscription.isActive) {
    // Check the TIER_LIMITS from the stripe.ts file to determine free tier access
    return hasFreeTierAccess(feature)
  }

  // Different tiers have different feature access
  switch (subscription.tier) {
    case 'pro':
      // Pro tier has access to all features
      return true
    case 'basic':
      // Basic tier has access to most features
      return hasBasicTierAccess(feature)
    case 'free':
    default:
      return hasFreeTierAccess(feature)
  }
}

// Helper functions to determine feature access by tier
function hasBasicTierAccess(feature: string): boolean {
  const basicFeatures = [
    'teach_back_sessions',
    'virtual_student_chat',
    'youtube_search',
    'auto_flashcards',
    'formula_sheet',
    'spaced_repetition',
    'voice_recording'
  ]
  return basicFeatures.includes(feature)
}

function hasFreeTierAccess(feature: string): boolean {
  const freeFeatures = [
    'teach_back_sessions',
    'virtual_student_chat',
    'youtube_search_basic',
    'spaced_repetition',
    'voice_recording'
  ]
  return freeFeatures.includes(feature)
} 