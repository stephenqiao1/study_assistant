import { Metadata } from 'next'
import PricingTable from '@/components/subscription/PricingTable'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Pricing - Academiq',
  description: 'Choose the perfect plan for your learning journey',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-light">
              Choose the perfect plan for your learning journey. Upgrade or downgrade at any time.
            </p>
          </div>

          <PricingTable />

          <div className="mx-auto mt-16 max-w-2xl text-center">
            <h2 className="text-2xl font-bold leading-10 tracking-tight text-text">
              Frequently asked questions
            </h2>
            <dl className="mt-10 space-y-8 text-left">
              <div>
                <dt className="text-base font-semibold leading-7 text-text">
                  What happens when I reach my usage limit?
                </dt>
                <dd className="mt-2 text-base leading-7 text-text-light">
                  When you reach your usage limit, you'll be prompted to upgrade to continue using the feature. Your existing content and progress will remain accessible.
                </dd>
              </div>
              <div>
                <dt className="text-base font-semibold leading-7 text-text">
                  Can I cancel my subscription?
                </dt>
                <dd className="mt-2 text-base leading-7 text-text-light">
                  Yes, you can cancel your subscription at any time. You'll continue to have access to your paid features until the end of your billing period.
                </dd>
              </div>
              <div>
                <dt className="text-base font-semibold leading-7 text-text">
                  What payment methods do you accept?
                </dt>
                <dd className="mt-2 text-base leading-7 text-text-light">
                  We accept all major credit cards through our secure payment processor, Stripe.
                </dd>
              </div>
              <div>
                <dt className="text-base font-semibold leading-7 text-text">
                  How does the YouTube video search feature work?
                </dt>
                <dd className="mt-2 text-base leading-7 text-text-light">
                  Our YouTube video search feature helps you find educational videos related to your study materials. Free users get basic search functionality, Basic plan users enjoy enhanced searching capabilities, and Pro users receive AI-powered recommendations that analyze your notes to find the most relevant videos for your specific learning needs.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
} 