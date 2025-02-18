'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { notFound, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { use } from 'react'
import { BookOpen, LogOut, Trash2, Edit2, Save, X } from 'lucide-react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import StudyToolSelector from '@/components/modules/StudyToolSelector'
import DraftEditor from '@/components/teach/DraftEditor'
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
import StudySessionsSidebar from '@/components/modules/StudySessionsSidebar'

interface PageProps {
  params: Promise<{ moduleId: string }>
}

interface Module {
  id: string
  module_title: string
  started_at: string
  details: {
    title: string
    content: string
    available_tools?: string[]
  }
}

export default function ModulePage({ params }: PageProps) {
  const router = useRouter()
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const { moduleId } = use(params)
  const [module, setModule] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [sessions, setSessions] = useState<Module[]>([])

  useEffect(() => {
    const fetchModule = async () => {
      if (!session?.user?.id) {
        console.log('No authenticated user found')
        return
      }

      const supabase = createClient()
      
      console.log('Current user ID:', session.user.id)
      console.log('Fetching study sessions for module:', moduleId)
      
      // First, let's see all study sessions for this user
      const { data: allUserSessions, error: userSessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', session.user.id)

      console.log('All user study sessions:', {
        count: allUserSessions?.length || 0,
        sessions: allUserSessions?.map(s => ({
          id: s.id,
          module_title: s.module_title,
          title: s.details.title,
          started_at: s.started_at
        })),
        error: userSessionsError
      })

      // Now get sessions for this specific module
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('module_title', moduleId)
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })

      console.log('Module-specific sessions:', {
        moduleId,
        userId: session.user.id,
        count: data?.length || 0,
        sessions: data?.map(s => ({
          id: s.id,
          module_title: s.module_title,
          title: s.details.title,
          started_at: s.started_at
        })),
        error
      })

      if (error) {
        console.error('Error fetching study sessions:', error)
        notFound()
      } else if (!data || data.length === 0) {
        console.log('No study sessions found for this module')
        notFound()
      } else {
        console.log('Setting current module and sessions:', {
          currentModule: {
            id: data[0].id,
            module_title: data[0].module_title,
            title: data[0].details.title,
            started_at: data[0].started_at
          },
          totalSessions: data.length
        })
        
        // Set the current module to the most recent session
        const currentModule = data[0]
        setModule(currentModule)
        setEditedContent(currentModule.details.content)
        setSessions(allUserSessions || [])  // Use all user sessions instead of filtered ones
        setIsLoading(false)
      }
    }

    fetchModule()
  }, [moduleId, session])

  const handleSignOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('module_title', moduleId)

      if (error) throw error

      // Redirect to modules page after successful deletion
      router.push('/modules')
    } catch (error) {
      console.error('Error deleting module:', error)
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleSave = async () => {
    if (!session?.user?.id) {
      console.error('No authenticated user')
      return
    }

    setIsSaving(true)
    const supabase = createClient()

    try {
      // Update the current session instead of creating a new one
      const { data: updatedSession, error } = await supabase
        .from('study_sessions')
        .update({
          details: {
            ...module.details,
            content: editedContent
          }
        })
        .eq('id', module.id)  // Use the specific session ID
        .select()
        .single()

      if (error) throw error

      // Update the current module
      setModule(updatedSession)
      
      // Update the session in the sessions list
      setSessions(prev => prev.map(s => 
        s.id === module.id ? updatedSession : s
      ))
      
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving module:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoadingAuth || isLoading) {
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
              <Link href="/modules" className="text-text hover:text-primary">Modules</Link>
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

      <div className="flex min-h-screen pt-16">
        {/* Study Sessions Sidebar */}
        <StudySessionsSidebar 
          sessions={sessions} 
          moduleTitle={moduleId}
        />

        {/* Main Content */}
        <main className="flex-1 pb-8 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-8">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-4 text-text">{module.details.title}</h1>
              </div>
              <div className="flex gap-2 ml-4">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleSave}
                      variant="default"
                      className="gap-2"
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditing(false)
                        setEditedContent(module.details.content)
                      }}
                      variant="outline"
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => setShowDeleteDialog(true)}
                      variant="outline"
                      className="gap-2 border-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
              <article className="prose prose-lg max-w-none">
                <DraftEditor
                  initialContent={isEditing ? editedContent : module.details.content}
                  readOnly={!isEditing}
                  onChange={content => setEditedContent(content)}
                />
              </article>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-text mb-4">Study Tools</h2>
                <StudyToolSelector 
                  moduleId={moduleId} 
                  availableTools={['teachBack', 'flashcards']} 
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this module?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the module
              and all associated study sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Module'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 