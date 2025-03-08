'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

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
  const [_authChangeProcessing, setAuthChangeProcessing] = useState(false)
  
  // Create supabase client for client-side usage
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;
    
    // Get initial session
    const loadSession = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session)
        setUser(session?.user || null)
        setIsEmailVerified(session?.user?.email_confirmed_at != null)
      } catch (error) {
        console.error('Error loading initial session:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // Prevent race conditions during auth state changes
      setAuthChangeProcessing(true);
      
      try {
        setSession(session)
        setUser(session?.user || null)
        setIsEmailVerified(session?.user?.email_confirmed_at != null)
        
        // If the user signed out and they're on a protected page, redirect to login
        if (event === 'SIGNED_OUT' && !session) {
          const protectedRoutes = ['/modules', '/insights', '/modules/'];
          if (protectedRoutes.some(route => pathname.startsWith(route))) {
            router.push('/login?from=signout');
          }
        }
      } catch (error) {
        console.error('Error during auth state change:', error);
      } finally {
        setIsLoading(false);
        setAuthChangeProcessing(false);
      }
    })

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    }
  }, [supabase.auth, router, pathname])

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