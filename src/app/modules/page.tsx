'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import CreateModuleModal from '@/components/modules/CreateModuleModal'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/components/ui/use-toast'

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

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
      data.forEach((module: any) => {
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

  const handleDeleteClick = (moduleTitle: string) => {
    setModuleToDelete(moduleTitle)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!moduleToDelete || !session?.user?.id) return

    setIsDeleting(true)
    try {
      const supabase = createClient()
      
      // Delete all study sessions with this module title
      // This will cascade delete related data due to foreign key constraints
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('module_title', moduleToDelete)
        .eq('user_id', session.user.id)

      if (error) {
        throw error
      }

      // Success - remove from local state
      setModules(modules.filter(m => m.module_title !== moduleToDelete))
      toast({
        title: "Module deleted",
        description: "The module and all related data have been removed.",
      })
    } catch (error) {
      console.error('Error deleting module:', error)
      toast({
        title: "Error deleting module",
        description: "There was a problem deleting the module. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setDeleteConfirmOpen(false)
      setModuleToDelete(null)
    }
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
                <CardFooter className="flex justify-between">
                  <Link
                    href={`/modules/${module.module_title}`}
                    className={buttonVariants({ variant: "default" })}
                  >
                    View Module
                  </Link>
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => handleDeleteClick(module.module_title)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="!bg-background-card dark:!bg-gray-900 !border-2 !border-border !shadow-xl !opacity-100 !rounded-md !p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-text">
              <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
              Delete Module
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-light">
              Are you sure you want to delete this module? This will permanently remove the module 
              and all associated notes, flashcards, and teach-back sessions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="!bg-background-card !border !border-border hover:!bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={isDeleting}
              className="!bg-destructive !text-destructive-foreground hover:!bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Module"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateModuleModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
      <Footer />
    </div>
  )
} 