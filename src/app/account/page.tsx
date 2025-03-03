'use client'

import { Suspense } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

// Separate component that uses useRequireAuth
function AccountContent() {
  useRequireAuth()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
          
          {/* Subscription Status */}
          <div className="mb-8">
            <SubscriptionStatus />
          </div>

          {/* Add other account settings sections here */}
        </div>
      </main>
      <Footer />
    </div>
  )
}

// Main component with Suspense boundary
export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Loading...</h2>
        <p className="text-muted-foreground">Please wait while we prepare your account page</p>
      </div>
    </div>}>
      <AccountContent />
    </Suspense>
  )
} 