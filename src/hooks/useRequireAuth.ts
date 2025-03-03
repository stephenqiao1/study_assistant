'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export const useRequireAuth = (redirectTo = '/login') => {
  const { session, user, isLoading, isEmailVerified } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !session) {
      // Redirect to login if not authenticated
      router.push(`${redirectTo}${redirectTo.includes('?') ? '&' : '?'}from=protected`)
    }
  }, [session, isLoading, router, redirectTo])

  return { session, user, isLoading, isEmailVerified }
}

export const useRequireNoAuth = (redirectTo = '/modules') => {
  const { session, user, isLoading, isEmailVerified } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    if (!isLoading && session) {
      // Get the 'from' query parameter to avoid redirect loops
      const from = searchParams.get('from')
      
      // Only redirect if we're not coming from a protected page
      if (from !== 'modules' && from !== 'protected') {
        router.push(redirectTo)
      }
    }
  }, [session, isLoading, router, redirectTo, searchParams])

  return { session, user, isLoading, isEmailVerified }
} 