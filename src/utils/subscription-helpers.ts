import { createClient } from '@/utils/supabase/client'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { SubscriptionTier } from '@/types/supabase'

/**
 * Check if the user has any premium subscription (basic or pro)
 */
export const isPremiumUser = async (userId: string): Promise<boolean> => {
  if (!userId) return false
  
  const supabase = createClient()
  
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .single()
      
    if (error) {
      console.error('Error checking subscription status:', error)
      return false
    }
    
    // Premium tiers are 'basic' and 'pro'
    return subscription?.tier === 'basic' || subscription?.tier === 'pro'
  } catch (error) {
    console.error('Error checking premium status:', error)
    return false
  }
}

/**
 * Check if the user has a specific subscription tier
 */
export const hasSubscriptionTier = async (userId: string, tier: SubscriptionTier): Promise<boolean> => {
  if (!userId) return false
  
  const supabase = createServiceRoleClient()
  
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
      
    if (error) {
      console.error('Error checking subscription status:', error)
      return false
    }

    // For basic tier, allow both 'basic' and 'pro' tiers
    if (tier === 'basic') {
      const hasAccess = subscription?.tier === 'basic' || subscription?.tier === 'pro'
      return hasAccess
    }
    
    // For pro tier, only allow 'pro' tier
    if (tier === 'pro') {
      const hasAccess = subscription?.tier === 'pro'
      return hasAccess
    }
    
    return false
  } catch (error) {
    console.error('Error checking subscription tier:', error)
    return false
  }
}

/**
 * Get the user's current subscription tier
 */
export const getUserSubscriptionTier = async (userId: string): Promise<SubscriptionTier | null> => {
  if (!userId) return null
  
  const supabase = createClient()
  
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .single()
      
    if (error) {
      console.error('Error getting subscription tier:', error)
      return null
    }
    
    return subscription?.tier || null
  } catch (error) {
    console.error('Error getting subscription tier:', error)
    return null
  }
} 