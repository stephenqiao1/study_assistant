'use client'

import { useState, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { BookOpen, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRequireNoAuth } from '@/hooks/useRequireAuth'
import GoogleLoginButton from '@/components/GoogleLoginButton'

// Separate component that uses useRequireNoAuth
function SignUpContent() {
  const { session, isLoading: isLoadingAuth } = useRequireNoAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [showVerificationMessage, setShowVerificationMessage] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number'
    }
    return null
  }

  const handleResendVerificationEmail = async () => {
    if (!signupEmail) {
      setMessage({
        type: 'error',
        text: 'Please enter an email address'
      })
      return
    }

    setIsResendingEmail(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match'
      })
      setIsLoading(false)
      return
    }

    // Validate password strength
    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      setMessage({
        type: 'error',
        text: passwordError
      })
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/modules`,
        },
      })

      if (error) {
        throw error
      }

      setSignupEmail(formData.email)
      setShowVerificationMessage(true)
      setMessage({
        type: 'success',
        text: 'Account created successfully! Please check your email to verify your account.',
      })

      // Don't redirect - allow user to see the verification options
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueWithoutVerification = () => {
    router.push('/modules')
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
          <h2 className="mt-4 text-2xl font-bold text-text">Create an Account</h2>
          <p className="mt-2 text-text-light">Join Academiq to start your learning journey</p>
        </div>

        {showVerificationMessage ? (
          <div className="bg-background-card p-8 rounded-lg shadow-sm border border-border">
            <h3 className="text-xl font-bold text-text mb-4">Email Verification</h3>
            <p className="text-text mb-6">
              We've sent a verification email to <strong>{signupEmail}</strong>. Please check your inbox and click the verification link.
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
            </div>
          </div>
        ) : (
          /* Sign Up Form */
          <div className="bg-background-card p-8 rounded-lg shadow-sm border border-border">
            <form onSubmit={handleSignUp} className="space-y-4">
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
                <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Create a password"
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
                <p className="mt-1 text-xs text-text-light">
                  Password must be at least 8 characters long and contain uppercase, lowercase, and numbers
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm your password"
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-text pr-10"
                  />
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
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-background-card text-text-light">Or continue with</span>
                </div>
              </div>
              
              <GoogleLoginButton />

              <p className="text-xs text-center text-text-light">
                By signing up, you agree to our{' '}
                <Link href="#" className="text-primary hover:text-primary-dark">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-primary hover:text-primary-dark">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>
        )}

        {/* Footer */}
        <p className="mt-4 text-center text-sm text-text-light">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary-dark">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

// Main component with Suspense boundary
export default function SignUp() {
  return (
    <Suspense fallback={<div className="container flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Loading...</h2>
        <p className="text-muted-foreground">Please wait while we prepare the signup page</p>
      </div>
    </div>}>
      <SignUpContent />
    </Suspense>
  )
} 