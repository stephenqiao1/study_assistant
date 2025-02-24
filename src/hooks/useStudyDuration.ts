import { useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'

type ActivityType = 'module' | 'teach_back' | 'flashcards'

export function useStudyDuration(
  studySessionId: string,
  activityType: ActivityType
) {
  const { session } = useAuth()
  const startTimeRef = useRef<string | null>(null)
  const durationIdRef = useRef<string | null>(null)

  useEffect(() => {
    let isSubscribed = true

    const handleDuration = async () => {
      if (!studySessionId || !session?.user?.id) return

      const supabase = createClient()

      try {
        // First, check for an existing active duration
        const { data: existingDuration, error: fetchError } = await supabase
          .from('study_durations')
          .select('id, started_at')
          .eq('study_session_id', studySessionId)
          .eq('activity_type', activityType)
          .eq('user_id', session.user.id)
          .is('ended_at', null)
          .limit(1)
          .maybeSingle()

        // If there's an error other than "no rows found", log it
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error checking existing duration:', fetchError)
          return
        }

        // If we found an existing duration, use it
        if (existingDuration) {
          durationIdRef.current = existingDuration.id
          startTimeRef.current = existingDuration.started_at
          return
        }

        // If no existing duration, create a new one
        const startTime = new Date().toISOString()
        const { data: newDuration, error: createError } = await supabase
          .from('study_durations')
          .insert({
            study_session_id: studySessionId,
            activity_type: activityType,
            started_at: startTime,
            user_id: session.user.id
          })
          .select('id, started_at')
          .limit(1)
          .single()

        if (createError) {
          console.error('Error starting duration:', createError)
          return
        }

        if (isSubscribed && newDuration) {
          durationIdRef.current = newDuration.id
          startTimeRef.current = startTime
        }
      } catch (error) {
        console.error('Error in handleDuration:', error)
      }
    }

    const endDuration = async () => {
      if (!durationIdRef.current || !startTimeRef.current) return

      const supabase = createClient()
      const endTime = new Date()
      
      try {
        const { error } = await supabase
          .from('study_durations')
          .update({
            ended_at: endTime.toISOString(),
            duration: Math.floor((endTime.getTime() - new Date(startTimeRef.current).getTime()) / 1000)
          })
          .eq('id', durationIdRef.current)

        if (error) {
          console.error('Error ending duration:', error)
        }
      } catch (error) {
        console.error('Error in endDuration:', error)
      }
    }

    // Start tracking when component mounts
    handleDuration()

    // End tracking when component unmounts
    return () => {
      isSubscribed = false
      endDuration()
    }
  }, [studySessionId, activityType, session?.user?.id])
} 