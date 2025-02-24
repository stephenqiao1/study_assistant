'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { UpgradeBanner } from '@/components/subscription/UpgradeBanner'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function DashboardPage() {
  useRequireAuth()
  const { teach_back: teachBackUsage } = useUsageLimits()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-24">
        {/* Show banner for free users */}
        {teachBackUsage.limit === 10 && (
          <UpgradeBanner type="dashboard" />
        )}

        {/* Rest of your dashboard content */}
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        {/* Add your dashboard components here */}
      </main>
      <Footer />
    </div>
  )
} 