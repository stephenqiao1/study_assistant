'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

export default function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false)
  const _router = useRouter()
  const { toast } = useToast()
  
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      
      const supabase = createClient()
      
      // Get the current URL origin for the redirect
      const origin = window.location.origin
      
      // Clear any existing session data to prevent conflicts
      await supabase.auth.signOut({ scope: 'local' })
      
      // Sign in with Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            // Request offline access to get a refresh token
            access_type: 'offline',
            // Force consent screen to ensure refresh token is always provided
            prompt: 'consent',
          },
          // Ensure we're getting a refresh token by requesting these scopes
          scopes: 'email profile openid',
        },
      })
      
      if (error) {
        console.error('Google OAuth error:', error)
        throw error
      }
      
      // If successful, data.url will contain the URL to redirect to
      if (data?.url) {
        // Redirect to the Google OAuth consent screen
        window.location.href = data.url
      } else {
        console.error('No redirect URL received from Supabase')
        throw new Error('Authentication failed: No redirect URL received')
      }
    } catch (error) {
      console.error('Google login error:', error)
      toast({
        title: 'Authentication Error',
        description: error instanceof Error ? error.message : 'Failed to sign in with Google',
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  }
  
  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2 border-border"
    >
      {/* Google Icon */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {isLoading ? 'Signing in...' : 'Continue with Google'}
    </Button>
  )
} 