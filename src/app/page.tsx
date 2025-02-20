'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, ChartLine, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'

export default function Home() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar showSignOut={false} />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-primary">
              Your Ultimate Study Assistant
            </h1>
            <p className="text-xl text-text-light mb-8">
              Prepare for any course with personalized practice problems, interactive tools, and real-time feedback.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="text-lg bg-accent-orange hover:bg-accent-orange/90">
                  Start Learning Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-text">
            How We Help You Succeed
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-border bg-background-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text">AI-Powered Learning</h3>
              <p className="text-text-light">
                Get personalized feedback and adaptive practice problems tailored to your needs.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-border bg-background-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent-teal/10 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-accent-teal" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text">Virtual Student Chat</h3>
              <p className="text-text-light">
                Practice teaching concepts to our AI student and receive instant feedback.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-border bg-background-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent-orange/10 rounded-lg flex items-center justify-center mb-4">
                <ChartLine className="h-6 w-6 text-accent-orange" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text">Progress Tracking</h3>
              <p className="text-text-light">
                Monitor your learning journey with detailed analytics and insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-background-card">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-text">
            How It Works
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-12">
              {/* Step 1 */}
              <div className="flex items-start gap-8">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-background-card flex items-center justify-center">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-text">Study Material & Practice</h3>
                  <p className="text-text-light">Access curated content and past exam questions.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-8">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-background-card flex items-center justify-center">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-text">Teach-Back Mode</h3>
                  <p className="text-text-light">Record your explanations using text, audio, or interactive whiteboards.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-8">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-background-card flex items-center justify-center">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-text">Instant Feedback</h3>
                  <p className="text-text-light">Receive immediate AI-driven analysis and analytics.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
