'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export const useRequireAuth = (redirectTo = '/login') => {
  const { session, user, isLoading, isEmailVerified } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !session) {
      router.push(redirectTo)
    }
  }, [session, isLoading, router, redirectTo])

  return { session, user, isLoading, isEmailVerified }
}

export const useRequireNoAuth = (redirectTo = '/modules') => {
  const { session, user, isLoading, isEmailVerified } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && session) {
      router.push(redirectTo)
    }
  }, [session, isLoading, router, redirectTo])

  return { session, user, isLoading, isEmailVerified }
} 