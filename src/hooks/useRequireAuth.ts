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
  const _searchParams = useSearchParams()
  
  useEffect(() => {
    if (!isLoading && session) {
      // Always redirect authenticated users to the modules page (or specified redirectTo)
      router.push(redirectTo)
    }
  }, [session, isLoading, router, redirectTo])

  return { session, user, isLoading, isEmailVerified }
} 