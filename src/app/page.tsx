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
      <section className="pt-24 pb-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent/10 text-accent mb-4">
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">AI-Powered Learning Assistant</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
                Master Any Subject with{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Active Learning
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Transform your study sessions with our AI-powered assistant that uses proven learning techniques like Feynman Technique and spaced repetition to help you deeply understand and remember any subject.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>    
            </div>
            
            <div className="relative h-[400px] hidden md:block">
              <div className="absolute top-0 right-0 w-full h-full bg-accent/5 rounded-xl border border-accent/20">
                <div className="absolute top-8 right-8 p-6 bg-card shadow-xl rounded-xl border border-card-border w-3/4 backdrop-blur-sm">
                  <div className="flex items-center mb-2">
                    <BookOpen className="h-5 w-5 text-primary mr-2" />
                    <h3 className="font-medium text-card-foreground">Neural Networks</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Create flashcards from your notes to reinforce key concepts</p>
                  <div className="flex gap-2">
                    <div className="py-1 px-3 bg-accent/10 rounded-full text-xs text-accent">Machine Learning</div>
                    <div className="py-1 px-3 bg-accent/10 rounded-full text-xs text-accent">AI</div>
                  </div>
                </div>
                
                <div className="absolute bottom-8 left-8 p-6 bg-card shadow-xl rounded-xl border border-card-border w-3/4 backdrop-blur-sm">
                  <div className="flex items-center mb-2">
                    <MessageCircle className="h-5 w-5 text-accent mr-2" />
                    <h3 className="font-medium text-card-foreground">Teaching Assistant</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Explain concepts back to solidify your understanding</p>
                  <div className="mt-3 h-2 bg-accent/10 rounded-full">
                    <div className="h-2 bg-gradient-to-r from-primary to-accent rounded-full w-3/4"></div>
                  </div>
                  <p className="text-xs text-right mt-1 text-muted-foreground">Mastery: 75%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Features Designed for Effective Learning
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Our platform combines proven learning techniques with AI to help you understand and remember information longer.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-card-border bg-background hover:shadow-xl transition-all hover:border-accent/50 hover:bg-card">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">Note-Centric Learning</h3>
              <p className="text-muted-foreground">
                Create and manage comprehensive notes with seamless integration to all learning tools.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Intelligent note organization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Markdown support with syntax highlighting</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">AI-powered module descriptions</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-card-border bg-background hover:shadow-xl transition-all hover:border-accent/50 hover:bg-card">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">Feynman Technique</h3>
              <p className="text-muted-foreground">
                Teach concepts back to our AI tutor to identify and fill knowledge gaps.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Real-time feedback on explanations</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Structured learning framework</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Customizable learning sessions</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-card-border bg-background hover:shadow-xl transition-all hover:border-accent/50 hover:bg-card">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <ChartLine className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">Smart Learning Tools</h3>
              <p className="text-muted-foreground">
                Advanced tools to enhance your learning and improve retention.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">AI-generated flashcards</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">YouTube video search & recommendations</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Formula extraction & organization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Spaced repetition system</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Three Steps Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Learn More Effectively in Three Simple Steps
          </h2>
          <p className="text-muted-foreground text-center text-lg mb-16 max-w-2xl mx-auto">
            Our proven methodology helps you move knowledge from short-term to long-term memory.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-primary-foreground font-bold mb-6 shadow-lg shadow-primary/20">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3 text-card-foreground">Capture Knowledge</h3>
              <p className="text-muted-foreground">
                Create comprehensive notes on any subject using our powerful editor with AI assistance.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-accent to-primary flex items-center justify-center text-primary-foreground font-bold mb-6 shadow-lg shadow-accent/20">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3 text-card-foreground">Reinforce Learning</h3>
              <p className="text-muted-foreground">
                Generate flashcards from your notes and practice with our spaced repetition system.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-primary-foreground font-bold mb-6 shadow-lg shadow-primary/20">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3 text-card-foreground">Master Through Teaching</h3>
              <p className="text-muted-foreground">
                Explain concepts to our AI student and get instant feedback on your understanding.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Choose the plan that best fits your learning needs and budget.
            </p>
          </div>
          <PricingTable />
          
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Compare plans to find the perfect fit for your learning journey.
            </p>
          </div>
        </div>
      </section>
      
      {/* Final CTA */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Ready to Transform Your Learning Experience?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of students who are already studying smarter, not harder.
            </p>
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                Get Started
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
