'use client'

import Link from 'next/link'
import { BookOpen, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function PrivacyPolicy() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full bg-background-card/80 backdrop-blur-sm border-b border-border z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-primary">Academiq</span>
            </Link>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-text hover:text-primary flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <div className="bg-background-card rounded-xl shadow-sm border border-border p-8">
          {/* Back button for mobile */}
          <div className="md:hidden mb-6">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="text-text hover:text-primary flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          <h1 className="text-3xl font-bold text-text mb-8">Privacy Policy</h1>
          
          <div className="space-y-8 text-text">
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="mb-4">
                At Academiq, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
              </p>
              <p>
                By using Academiq, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
              <div className="space-y-4">
                <h3 className="font-medium">2.1 Personal Information</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Email address</li>
                  <li>Name (if provided)</li>
                  <li>Profile information</li>
                  <li>Study data and learning progress</li>
                </ul>

                <h3 className="font-medium">2.2 Usage Information</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Browser type and version</li>
                  <li>Operating system</li>
                  <li>Time spent on pages</li>
                  <li>Study session data</li>
                  <li>Feature usage patterns</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide and maintain our service</li>
                <li>To notify you about changes to our service</li>
                <li>To provide customer support</li>
                <li>To gather analysis or valuable information to improve our service</li>
                <li>To monitor the usage of our service</li>
                <li>To detect, prevent and address technical issues</li>
                <li>To personalize your learning experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">4. Data Storage and Security</h2>
              <p className="mb-4">
                We use Supabase for data storage, which implements industry-standard security measures to protect your information. Your data is encrypted both in transit and at rest.
              </p>
              <p>
                While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">5. Third-Party Services</h2>
              <p className="mb-4">
                We may employ third-party companies and individuals for the following reasons:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>To facilitate our service</li>
                <li>To provide the service on our behalf</li>
                <li>To perform service-related tasks</li>
                <li>To assist us in analyzing how our service is used</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">6. Your Rights</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Correct any inaccurate personal data</li>
                <li>Request deletion of your personal data</li>
                <li>Object to processing of your personal data</li>
                <li>Request transfer of your personal data</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">7. Changes to This Privacy Policy</h2>
              <p className="mb-4">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "effective date" at the top of this Privacy Policy.
              </p>
              <p>
                You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">8. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <ul className="list-disc pl-6 mt-4">
                <li>By email: support@academiq.live</li>
                <li>By visiting our website: www.academiq.live/contact</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border text-sm text-text-light">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </main>
    </div>
  )
} 