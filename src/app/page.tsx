'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Brain, ChartLine, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/layout/Footer'

export default function Home() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header & Navigation */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-primary">
                Academiq
              </span>
            </Link>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-text hover:text-primary">Home</Link>
              <Link href="#features" className="text-text hover:text-primary">Features</Link>
              <Link href="#how-it-works" className="text-text hover:text-primary">How It Works</Link>
              <Link href="/modules" className="text-text hover:text-primary">Modules</Link>
            </nav>

            {/* CTA Button */}
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button className="bg-accent-orange hover:bg-accent-orange/90">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary/5 to-secondary">
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
            <p className="mt-6 text-sm text-text-light">
              Trusted by thousands of students worldwide
            </p>
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
            <div className="p-6 rounded-xl border bg-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text">AI-Powered Learning</h3>
              <p className="text-text-light">
                Get personalized feedback and adaptive practice problems tailored to your needs.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border bg-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent-teal/10 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-accent-teal" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text">Virtual Student Chat</h3>
              <p className="text-text-light">
                Practice teaching concepts to our AI student and receive instant feedback.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border bg-white hover:shadow-lg transition-shadow">
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
      <section id="how-it-works" className="py-20 bg-secondary-dark">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-text">
            How It Works
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-12">
              {/* Step 1 */}
              <div className="flex items-start gap-8">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-text">Study Material & Practice</h3>
                  <p className="text-text-light">Access curated content and past exam questions.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-8">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-text">Teach-Back Mode</h3>
                  <p className="text-text-light">Record your explanations using text, audio, or interactive whiteboards.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-8">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
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

      {/* Footer */}
      <Footer />
    </div>
  );
}
