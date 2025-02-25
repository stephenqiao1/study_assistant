'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, ChartLine, MessageCircle, Sparkles, BookOpen, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import PricingTable from '@/components/subscription/PricingTable'

export default function Home() {
  useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar showSignOut={false} />

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary mb-4">
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">AI-Powered Learning Assistant</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-text">
                Master Any Subject with <span className="text-primary">Active Learning</span>
              </h1>
              <p className="text-xl text-text-light mb-8">
                Transform your study sessions with our AI-powered assistant that uses proven learning techniques like Feynman Technique and spaced repetition to help you deeply understand and remember any subject.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto text-lg bg-primary hover:bg-primary/90">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg">
                    View Pricing
                  </Button>
                </Link>
              </div>    
            </div>
            
            <div className="relative h-[400px] hidden md:block">
              <div className="absolute top-0 right-0 w-full h-full bg-accent-teal/5 rounded-xl border border-accent-teal/20">
                <div className="absolute top-8 right-8 p-6 bg-background-card shadow-xl rounded-xl border border-border w-3/4">
                  <div className="flex items-center mb-2">
                    <BookOpen className="h-5 w-5 text-primary mr-2" />
                    <h3 className="font-medium text-text">Neural Networks</h3>
                  </div>
                  <p className="text-sm text-text-light mb-4">Create flashcards from your notes to reinforce key concepts</p>
                  <div className="flex gap-2">
                    <div className="py-1 px-3 bg-primary/10 rounded-full text-xs text-primary">Machine Learning</div>
                    <div className="py-1 px-3 bg-primary/10 rounded-full text-xs text-primary">AI</div>
                  </div>
                </div>
                
                <div className="absolute bottom-8 left-8 p-6 bg-background-card shadow-xl rounded-xl border border-border w-3/4">
                  <div className="flex items-center mb-2">
                    <MessageCircle className="h-5 w-5 text-accent-orange mr-2" />
                    <h3 className="font-medium text-text">Teaching Assistant</h3>
                  </div>
                  <p className="text-sm text-text-light">Explain concepts back to solidify your understanding</p>
                  <div className="mt-3 h-2 bg-accent-orange/20 rounded-full">
                    <div className="h-2 bg-accent-orange rounded-full w-3/4"></div>
                  </div>
                  <p className="text-xs text-right mt-1 text-text-light">Mastery: 75%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-text">
              Features Designed for Effective Learning
            </h2>
            <p className="text-text-light max-w-2xl mx-auto">
              Our platform combines proven learning techniques with AI to help you understand and remember information longer.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-border bg-background-card hover:shadow-lg transition-all hover:border-primary/50">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text">Note-Centric Learning</h3>
              <p className="text-text-light">
                Create comprehensive notes that automatically connect to flashcards and teach-back sessions.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-accent-teal mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-light">Intelligent note organization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-accent-teal mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-light">Markdown support with syntax highlighting</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-border bg-background-card hover:shadow-lg transition-all hover:border-accent-teal/50">
              <div className="w-12 h-12 bg-accent-teal/10 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-accent-teal" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text">Feynman Technique</h3>
              <p className="text-text-light">
                Teach concepts back to our AI tutor to identify and fill knowledge gaps.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-accent-teal mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-light">Real-time feedback on explanations</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-accent-teal mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-light">Structured learning framework</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-border bg-background-card hover:shadow-lg transition-all hover:border-accent-orange/50">
              <div className="w-12 h-12 bg-accent-orange/10 rounded-lg flex items-center justify-center mb-4">
                <ChartLine className="h-6 w-6 text-accent-orange" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text">Smart Flashcards</h3>
              <p className="text-text-light">
                Spaced repetition system that optimizes your review schedule for maximum retention.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-accent-teal mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-light">AI-generated flashcards from your notes</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-accent-teal mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-light">Adaptive difficulty based on performance</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-background-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-text">
              Learn More Effectively in Three Simple Steps
            </h2>
            <p className="text-text-light max-w-2xl mx-auto">
              Our proven methodology helps you move knowledge from short-term to long-term memory.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary text-background-card flex items-center justify-center mb-6 mx-auto md:mx-0">
                  1
                </div>
                <div className="hidden md:block absolute top-6 left-12 w-full h-0.5 bg-border"></div>
                <h3 className="text-xl font-semibold mb-3 text-text text-center md:text-left">Capture Knowledge</h3>
                <p className="text-text-light text-center md:text-left">
                  Create comprehensive notes on any subject using our powerful editor with AI assistance.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary text-background-card flex items-center justify-center mb-6 mx-auto md:mx-0">
                  2
                </div>
                <div className="hidden md:block absolute top-6 left-12 w-full h-0.5 bg-border"></div>
                <h3 className="text-xl font-semibold mb-3 text-text text-center md:text-left">Reinforce Learning</h3>
                <p className="text-text-light text-center md:text-left">
                  Generate flashcards from your notes and practice with our spaced repetition system.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary text-background-card flex items-center justify-center mb-6 mx-auto md:mx-0">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-3 text-text text-center md:text-left">Master Through Teaching</h3>
                <p className="text-text-light text-center md:text-left">
                  Explain concepts to our AI student and get instant feedback on your understanding.
                </p>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <Link href="/signup">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Start Your Learning Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-background-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-text">
              Simple, Transparent Pricing
            </h2>
            <p className="text-text-light max-w-2xl mx-auto">
              Choose the plan that best fits your needs. All plans include access to our core learning features.
            </p>
          </div>
          <PricingTable />
          
          <div className="mt-12 text-center">
            <p className="text-sm text-text-light mb-4">
              Not sure which plan is right for you? Start with our free tier and upgrade anytime.
            </p>
            <Link href="/signup">
              <Button variant="outline" className="mx-auto">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Final CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 text-text">
              Ready to Transform Your Learning Experience?
            </h2>
            <p className="text-lg text-text-light mb-8">
              Join thousands of students who are already studying smarter, not harder.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
