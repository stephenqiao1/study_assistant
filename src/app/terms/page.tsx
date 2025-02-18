'use client'

import Link from 'next/link'
import { BookOpen, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function TermsOfService() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b z-50">
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
        <div className="bg-white rounded-xl shadow-sm border p-8">
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

          <h1 className="text-3xl font-bold text-text mb-8">Terms of Service</h1>
          
          <div className="space-y-8 text-text">
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Agreement to Terms</h2>
              <p className="mb-4">
                By accessing and using Academiq, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">2. Use License</h2>
              <div className="space-y-4">
                <p>
                  Permission is granted to temporarily access the materials (information or software) on Academiq for personal, non-commercial use only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose</li>
                  <li>Attempt to decompile or reverse engineer any software contained on Academiq</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                  <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
              <div className="space-y-4">
                <p>When you create an account with us, you must provide accurate, complete, and current information. You are responsible for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintaining the confidentiality of your account and password</li>
                  <li>Restricting access to your computer and account</li>
                  <li>Accepting responsibility for all activities that occur under your account</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">4. Content Guidelines</h2>
              <p className="mb-4">
                Users are responsible for the content they create and share on Academiq. Content must not:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Contain harmful or malicious code</li>
                <li>Include inappropriate or offensive material</li>
                <li>Misrepresent or impersonate others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">5. Service Modifications</h2>
              <p>
                Academiq reserves the right to modify, suspend, or discontinue any part of the service at any time without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">6. Intellectual Property</h2>
              <p className="mb-4">
                The service and its original content, features, and functionality are owned by Academiq and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">7. Limitation of Liability</h2>
              <p>
                In no event shall Academiq, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">8. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">9. Changes to Terms</h2>
              <p>
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">10. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="list-disc pl-6 mt-4">
                <li>By email: support@academiq.live</li>
                <li>By visiting our website: www.academiq.live/contact</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t text-sm text-text-light">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </main>
    </div>
  )
} 