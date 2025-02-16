'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { BookOpen, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRequireNoAuth } from '@/hooks/useRequireAuth'

export default function Login() {
  const { session, isLoading: isLoadingAuth } = useRequireNoAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Login attempt started')
    setIsLoading(true)
    setMessage(null)

    try {
      console.log('Attempting to sign in with:', { email: formData.email })
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      console.log('Supabase auth response:', { data, error })

      if (error) {
        console.error('Login error:', error)
        throw error
      }

      if (data?.session) {
        console.log('Session obtained:', data.session)
        
        try {
          // Set the session in Supabase client
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })

          if (sessionError) {
            console.error('Error setting session:', sessionError)
            throw sessionError
          }

          console.log('Session set successfully')
          
          // Add a small delay to ensure session is properly set
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Redirect to dashboard
          window.location.href = '/dashboard'
        } catch (sessionError) {
          console.error('Session setup error:', sessionError)
          setMessage({
            type: 'error',
            text: 'Error setting up session. Please try again.'
          })
        }
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
      console.log('Login process completed')
    }
  }

  const handleResetPassword = async () => {
    if (!formData.email) {
      setMessage({
        type: 'error',
        text: 'Please enter your email address'
      })
      return
    }

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
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-4">
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

        {/* Login Form */}
        <div className="bg-white p-8 rounded-lg shadow-sm border">
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
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-black"
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
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

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