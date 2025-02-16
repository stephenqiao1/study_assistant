'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export const useRequireAuth = (redirectTo = '/login') => {
  const { session, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !session) {
      router.push(redirectTo)
    }
  }, [session, isLoading, router, redirectTo])

  return { session, isLoading }
}

export const useRequireNoAuth = (redirectTo = '/dashboard') => {
  const { session, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && session) {
      router.push(redirectTo)
    }
  }, [session, isLoading, router, redirectTo])

  return { session, isLoading }
} 