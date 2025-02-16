'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { notFound } from 'next/navigation'
import ModuleContent from '@/components/modules/ModuleContent'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { use } from 'react'
import { Edit, Save, X, BookOpen, LogOut } from 'lucide-react'
import TextEditor from '@/components/teach/TextEditor'
import { useRequireAuth } from '@/hooks/useRequireAuth'

interface PageProps {
  params: Promise<{ moduleId: string }>
}

export default function ModulePage({ params }: PageProps) {
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const { moduleId } = use(params)
  const [isEditing, setIsEditing] = useState(false)
  const [module, setModule] = useState<any>(null)
  const [editedContent, setEditedContent] = useState('')
  const [editedTitle, setEditedTitle] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchModule = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('module_id', moduleId)
        .eq('session_type', 'text')
        .single()

      if (error || !data) {
        console.log('Module not found, redirecting to 404')
        notFound()
      } else {
        setModule(data)
        setEditedContent(data.details.content)
        setEditedTitle(data.details.title)
        setIsLoading(false)
      }
    }

    fetchModule()
  }, [moduleId])

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          details: {
            ...module.details,
            content: editedContent,
            title: editedTitle
          }
        })
        .eq('module_id', moduleId)
        .eq('session_type', 'text')

      if (error) throw error

      // Update local state
      setModule({
        ...module,
        details: {
          ...module.details,
          content: editedContent,
          title: editedTitle
        }
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving module:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
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
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] bg-white/80 backdrop-blur-sm border-b z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-end h-16">
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

      {/* Main Content */}
      <main className="ml-64 px-4 pt-24 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-3xl font-bold w-full p-2 border rounded mb-4 dark:bg-gray-800"
                />
              ) : (
                <h1 className="text-3xl font-bold mb-4 text-text">{module.details.title}</h1>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setEditedContent(module.details.content)
                      setEditedTitle(module.details.title)
                    }}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Module
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            {isEditing ? (
              <TextEditor
                value={editedContent}
                onChange={setEditedContent}
              />
            ) : (
              <ModuleContent module={module} />
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <Link href={`/modules/${moduleId}/teach`}>
              <Button size="lg" className="gap-2">
                🎓 Enter Teach Back Mode
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 