import { createClient } from '@/utils/supabase/client'

type UsageType = 'teach_back'
type UsageField = 'teach_back_count'

export interface UsageRecord {
  user_id: string
  month_year: string
  teach_back_count: number
}

export async function checkAndIncrementUsage(
  userId: string,
  usageType: UsageType
): Promise<{ allowed: boolean; currentUsage: number; limit: number; error?: string }> {
  const supabase = createClient()
  const currentDate = new Date()
  const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

  try {
    // Get user's subscription tier and limits
    let finalSubscription
    const { data: initialSubscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier, usage_limits')
      .eq('user_id', userId)
      .single()

    finalSubscription = initialSubscription

    // If no subscription exists, create one with free tier limits
    if (!finalSubscription && subError?.code === 'PGRST116') {
      const { data: newSubscription, error: createError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          tier: 'free',
          interval: 'month',
          stripe_subscription_id: null,
          stripe_customer_id: null,
          current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          usage_limits: {
            teach_back_sessions: 10,
            auto_flashcards_enabled: false
          }
        })
        .select()
        .single()

      if (createError) throw createError
      finalSubscription = newSubscription
    } else if (subError) {
      throw subError
    }

    // Add non-null assertion since we know subscription exists at this point
    const limits = finalSubscription!.usage_limits
    const usageField: UsageField = 'teach_back_count'
    const usageLimit = limits.teach_back_sessions

    // Get current usage
    let finalUsage
    const { data: initialUsage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single()

    finalUsage = initialUsage

    // If no usage tracking exists for this month, create one
    if (!finalUsage && usageError?.code === 'PGRST116') {
      const { data: newUsage, error: createUsageError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          month_year: monthYear,
          teach_back_count: 0
        })
        .select()
        .single()

      if (createUsageError) throw createUsageError
      finalUsage = newUsage
    } else if (usageError && usageError.code !== 'PGRST116') {
      throw usageError
    }

    const currentUsage = finalUsage?.[usageField] || 0

    // Check if user has reached their limit
    if (usageLimit !== -1 && currentUsage >= usageLimit) {
      return {
        allowed: false,
        currentUsage,
        limit: usageLimit,
        error: `You've reached your monthly ${usageType.replace('_', ' ')} limit. Please upgrade your plan for more.`
      }
    }

    // Increment usage
    const { error: updateError } = await supabase
      .from('usage_tracking')
      .update({
        [usageField]: currentUsage + 1
      })
      .eq('user_id', userId)
      .eq('month_year', monthYear)

    if (updateError) throw updateError

    return {
      allowed: true,
      currentUsage: currentUsage + 1,
      limit: usageLimit
    }
  } catch (error) {
    console.error(`Error checking/incrementing ${usageType} usage:`, error)
    throw error
  }
}

export async function getCurrentUsage(userId: string): Promise<{
  teach_back: { current: number; limit: number };
  auto_flashcards_enabled: boolean;
}> {
  const supabase = createClient()
  const currentDate = new Date()
  const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

  try {
    // Get subscription limits
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier, usage_limits')
      .eq('user_id', userId)
      .single()

    if (subError) throw subError

    // Get current usage
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      throw usageError
    }

    return {
      teach_back: {
        current: usage?.teach_back_count || 0,
        limit: subscription.usage_limits.teach_back_sessions
      },
      auto_flashcards_enabled: subscription.usage_limits.auto_flashcards_enabled
    }
  } catch (error) {
    console.error('Error getting current usage:', error)
    throw error
  }
} 