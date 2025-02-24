'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import CreateModuleModal from '@/components/modules/CreateModuleModal'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'

interface Module {
  module_title: string
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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const supabase = createClient()

  const fetchModules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('module_title, details, started_at')
        .order('started_at', { ascending: false })

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      // Create a map to store unique modules with their latest data
      const moduleMap = new Map()
      data.forEach((module) => {
        if (!moduleMap.has(module.module_title) || 
            new Date(module.started_at) > new Date(moduleMap.get(module.module_title).started_at)) {
          moduleMap.set(module.module_title, module)
        }
      })

      // Convert map values to array
      setModules(Array.from(moduleMap.values()))
    } catch (error) {
      console.error('Error fetching modules:', error)
    } finally {
      setIsLoadingData(false)
    }
  }, [supabase])

  useEffect(() => {
    if (session) {
      fetchModules()
    }
  }, [session, fetchModules])

  const handleCreateSuccess = () => {
    // Refresh the modules list after creating a new module
    fetchModules()
  }

  if (isLoading || isLoadingData) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect in useRequireAuth
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-text">Study Modules</h1>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Module
            </Button>
          </div>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <Card key={module.module_title} className="bg-background-card border-border">
                <CardHeader>
                  <CardTitle className="text-text">{module.details.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-text-light">
                      Started: {new Date(module.started_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link
                    href={`/modules/${module.module_title}`}
                    className={buttonVariants({ variant: "default" })}
                  >
                    View Module
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <CreateModuleModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
      <Footer />
    </div>
  )
} 