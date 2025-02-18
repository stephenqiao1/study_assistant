'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { BookOpen, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRequireNoAuth } from '@/hooks/useRequireAuth'

export default function SignUp() {
  const { session, isLoading: isLoadingAuth } = useRequireNoAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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

      setMessage({
        type: 'success',
        text: 'Account created successfully! Please check your email to verify your account.',
      })

      // Optional: Redirect to login page after successful signup
      setTimeout(() => {
        router.push('/login')
      }, 2000)
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
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-4">
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

        {/* Sign Up Form */}
        <div className="bg-white p-8 rounded-lg shadow-sm border">
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
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-black"
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10 text-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10 text-black"
                />
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
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