'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, LogOut, ArrowRight } from 'lucide-react'

interface Module {
  module_id: string
  details: {
    title: string
    content: string
    teach_backs?: Array<{
      grade: number
      timestamp: string
    }>
  }
  started_at: string
}

export default function ModulesPage() {
  const { session, isLoading } = useRequireAuth()
  const [modules, setModules] = useState<Module[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const { data, error } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('session_type', 'text')
          .order('started_at', { ascending: false })

        if (error) throw error

        // Create a map to store unique modules with their latest data
        const moduleMap = new Map()
        data.forEach((module) => {
          if (!moduleMap.has(module.module_id) || 
              new Date(module.started_at) > new Date(moduleMap.get(module.module_id).started_at)) {
            moduleMap.set(module.module_id, module)
          }
        })

        // Convert map values to array
        setModules(Array.from(moduleMap.values()))
      } catch (error) {
        console.error('Error fetching modules:', error)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchModules()
  }, [])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  if (isLoading || isLoadingData) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect in useRequireAuth
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header & Navigation */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-primary">
                Academiq
              </span>
            </Link>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/dashboard" className="text-text hover:text-primary">Dashboard</Link>
              <Link href="/modules" className="text-primary">Modules</Link>
              <Button 
                variant="ghost" 
                className="text-text hover:text-primary flex items-center gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-text">Study Modules</h1>
          </div>

          {/* Modules Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => {
              // Get the highest grade from teach_backs
              const highestGrade = module.details.teach_backs?.reduce((max: number, tb: { grade: number }) => 
                tb.grade > max ? tb.grade : max, 0) || 0

              // Get content preview (first 150 characters)
              const contentPreview = module.details.content
                .replace(/[#*`]/g, '') // Remove markdown characters
                .slice(0, 150) + '...'

              return (
                <Card key={module.module_id} className="bg-white hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-text">{module.details.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-text-light text-sm">{contentPreview}</p>
                    <div className="flex items-center justify-between">
                      {highestGrade > 0 && (
                        <div className="text-sm">
                          <span className="text-text-light">Best Grade: </span>
                          <span className="font-medium text-accent-orange">{highestGrade}%</span>
                        </div>
                      )}
                      <Link href={`/modules/${module.module_id}`}>
                        <Button className="gap-2">
                          View Module
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
} 