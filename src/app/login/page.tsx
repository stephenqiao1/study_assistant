'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { BookOpen, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRequireNoAuth } from '@/hooks/useRequireAuth'
import { useSearchParams, useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { SupabaseClient } from '@supabase/supabase-js'

// Separate component that uses useSearchParams
function LoginForm() {
  const { session, isLoading: isLoadingAuth } = useRequireNoAuth('/modules')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [showVerificationScreen, setShowVerificationScreen] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const searchParams = useSearchParams()
  const { toast: _toast } = useToast()
  const router = useRouter()
  
  // Get Supabase client
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  
  useEffect(() => {
    const initSupabase = async () => {
      const client = await createClient()
      setSupabase(client)
    }
    
    initSupabase()
  }, [])
  
  // Check URL for error params
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'session') {
      setMessage({
        type: 'error',
        text: 'Authentication session expired. Please sign in again.'
      })
    }
    
  }, [searchParams])

  const handleResendVerificationEmail = async () => {
    if (!supabase) return
    
    setIsResendingEmail(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unverifiedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/modules`,
        }
      })

      if (error) {
        throw error
      }

      setMessage({
        type: 'success',
        text: 'Verification email resent. Please check your inbox.'
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsResendingEmail(false)
    }
  }
  
  const handleContinueWithoutVerification = async () => {
    if (!supabase) return
    
    setIsLoading(true);
    try {
      // Store the unverified email in sessionStorage
      sessionStorage.setItem('unverifiedEmail', unverifiedEmail);
      
      // We also need to store the password temporarily to complete the login
      sessionStorage.setItem('pendingLogin', JSON.stringify({
        email: formData.email,
        password: formData.password
      }));
      
      // Redirect to modules page - the modules page will need to handle the login
      window.location.href = '/modules?bypassVerification=true';
    } catch (error) {
      console.error('Error continuing without verification:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      });
      setIsLoading(false);
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setIsLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        console.error('Login error:', error)
        
        // Check if the error is because email is not confirmed
        if (error.message === 'Email not confirmed') {
          setUnverifiedEmail(formData.email)
          setShowVerificationScreen(true)
          setIsLoading(false)
          return
        }
        
        throw error
      }

      if (data?.session) {
        // Check if there's a next parameter in the URL that should override the default redirect
        const nextUrl = searchParams.get('next') || '/modules';
        // Redirect to the next URL or modules page
        router.push(nextUrl);
      } else {
        console.warn('No session data received after successful login')
        setMessage({
          type: 'error',
          text: 'Authentication successful but no session created'
        })
      }
    } catch (error) {
      console.error('Login error caught:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!formData.email || !supabase) return
    
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw error
      }

      setMessage({
        type: 'success',
        text: 'Password reset instructions sent to your email'
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (session) {
    return null // Will redirect in useRequireNoAuth
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">Academiq</span>
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-text">Welcome Back</h2>
          <p className="mt-2 text-text-light">Sign in to your account</p>
        </div>

        {showVerificationScreen ? (
          /* Verification Screen */
          <div className="bg-background-card p-8 rounded-lg shadow-sm border border-border">
            <h3 className="text-xl font-bold text-text mb-4">Email Verification Required</h3>
            <p className="text-text mb-6">
              Your email <strong>{unverifiedEmail}</strong> has not been verified yet. Please check your inbox for the verification link or request a new one.
            </p>

            {message && (
              <div className={`p-3 mb-4 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                  : 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleResendVerificationEmail}
                className="w-full bg-primary hover:bg-primary-dark"
                disabled={isResendingEmail}
              >
                {isResendingEmail ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              
              <Button
                type="button"
                onClick={handleContinueWithoutVerification}
                className="w-full bg-secondary hover:bg-secondary-dark text-text"
              >
                Continue Without Verification
              </Button>

              <button
                type="button"
                onClick={() => setShowVerificationScreen(false)}
                className="w-full text-text-light hover:text-text text-sm mt-2"
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="bg-background-card p-8 rounded-lg shadow-sm border border-border">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-text"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-text">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-sm text-primary hover:text-primary-dark"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your password"
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-text pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                    : 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                }`}>
                  {message.text}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </div>
        )}

        {/* Footer */}
        <p className="mt-4 text-center text-sm text-text-light">
          Don't have an account?{' '}
          <Link href="/signup" className="text-primary hover:text-primary-dark">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

// Main component with Suspense boundary
export default function Login() {
  return (
    <Suspense fallback={<div className="container flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Loading...</h2>
        <p className="text-muted-foreground">Please wait while we prepare the login page</p>
      </div>
    </div>}>
      <LoginForm />
    </Suspense>
  )
}