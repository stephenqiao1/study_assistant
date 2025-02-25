'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

type AuthContextType = {
  session: Session | null
  user: User | null
  isLoading: boolean
  isEmailVerified: boolean
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEmailVerified, setIsEmailVerified] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user || null)
      setIsEmailVerified(session?.user?.email_confirmed_at != null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      setIsEmailVerified(session?.user?.email_confirmed_at != null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/modules`,
        }
      })

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Error resending verification email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to resend verification email' 
      }
    }
  }

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      isLoading, 
      isEmailVerified,
      resendVerificationEmail 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 