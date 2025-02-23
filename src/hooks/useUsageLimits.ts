import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from './useRequireAuth'

interface UsageLimit {
  current: number
  limit: number
  isLimited: boolean
}

interface UsageLimits {
  teach_back: UsageLimit
  auto_flashcards_enabled: boolean
  isLoading: boolean
  error?: string
  refetch: () => Promise<void>
}

export function useUsageLimits(): UsageLimits {
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const [usage, setUsage] = useState<UsageLimits>({
    teach_back: {
      current: 0,
      limit: 0,
      isLimited: false
    },
    auto_flashcards_enabled: false,
    isLoading: true,
    error: undefined,
    refetch: async () => {}
  })

  const fetchUsage = useCallback(async () => {
    if (!session?.user?.id) return

    const supabase = createClient()
    const currentDate = new Date()
    const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

    try {
      // Get subscription limits
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('usage_limits')
        .eq('user_id', session.user.id)
        .single()

      if (subError) throw subError

      // Get current usage
      const { data: currentUsage, error: usageError } = await supabase
        .from('usage_tracking')
        .select('teach_back_count')
        .eq('user_id', session.user.id)
        .eq('month_year', monthYear)
        .single()

      if (usageError && usageError.code !== 'PGRST116') throw usageError

      const teachBackLimit = subscription?.usage_limits?.teach_back_sessions ?? 0
      const teachBackCount = currentUsage?.teach_back_count ?? 0
      const autoFlashcardsEnabled = subscription?.usage_limits?.auto_flashcards_enabled ?? false

      setUsage(prev => ({
        ...prev,
        isLoading: false,
        teach_back: {
          current: teachBackCount,
          limit: teachBackLimit,
          isLimited: teachBackLimit !== -1 && teachBackCount >= teachBackLimit
        },
        auto_flashcards_enabled: autoFlashcardsEnabled
      }))
    } catch (error) {
      console.error('Error fetching usage limits:', error)
      setUsage(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage limits'
      }))
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (isLoadingAuth || !session?.user?.id) {
      return
    }

    // Initial fetch
    fetchUsage()

    // Set up real-time subscription for usage_tracking changes
    const supabase = createClient()
    
    const channel = supabase.channel(`usage_tracking:${session.user.id}`, {
      config: {
        broadcast: { self: true },
        presence: { key: session.user.id },
      },
    })

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usage_tracking',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          fetchUsage()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to usage tracking changes')
        }
      })

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [isLoadingAuth, fetchUsage, session?.user?.id])

  // Update the refetch function whenever fetchUsage changes
  useEffect(() => {
    setUsage(prev => ({ ...prev, refetch: fetchUsage }))
  }, [fetchUsage])

  return usage
} 