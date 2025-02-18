'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!email) return
    
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe')
      }

      setMessage({ type: 'success', text: 'Successfully subscribed to newsletter!' })
      setEmail('')
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to subscribe'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <footer className="bg-secondary-dark border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-bold text-text">Academiq</span>
            </Link>
            <p className="mt-2 text-sm text-text-light">
              Your AI-powered learning companion
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-text">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-text-light hover:text-primary">Home</Link></li>
              <li><Link href="/modules" className="text-text-light hover:text-primary">Modules</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4 text-text">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-text-light hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-text-light hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4 text-text">Stay Updated</h3>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-text"
                required
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="w-full bg-accent-orange hover:bg-accent-orange/90"
                disabled={isLoading}
              >
                {isLoading ? 'Subscribing...' : 'Subscribe'}
              </Button>
              {message && (
                <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
                  {message.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
              <p className="text-xs text-text-light mt-2">
                By subscribing, you agree to our{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-text-light">
          <p>© {new Date().getFullYear()} Academiq. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
} 