'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ChatInterface from '@/components/chat/ChatInterface'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

interface PageProps {
  params: Promise<{ moduleId: string }>
}

export default function VirtualChatPage({ params }: PageProps) {
  const { moduleId } = use(params)
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const [moduleContent, setModuleContent] = useState('')
  const [moduleTitle, setModuleTitle] = useState('')
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchModuleDetails = async () => {
      if (!session?.user?.id) return

      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      try {
        const { data: module, error: moduleError } = await supabase
          .from('study_sessions')
          .select('id, details')
          .eq('module_title', moduleId)
          .eq('user_id', session.user.id)
          .single()

        if (moduleError) {
          throw moduleError
        }

        if (!module?.details) {
          throw new Error('No module details found')
        }

        const content = module.details.content || ''
        const title = module.details.title || ''

        if (!content.trim()) {
          throw new Error('No content available for this module')
        }

        setModuleTitle(title)
        setModuleContent(content)

        // Fetch existing chat history
        const { data: virtualChats, error: chatError } = await supabase
          .from('virtual_chats')
          .select('conversation')
          .eq('study_session_id', module.id)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!chatError && virtualChats?.conversation) {
          setChatHistory(virtualChats.conversation)
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load module content')
      } finally {
        setIsLoading(false)
      }
    }

    fetchModuleDetails()
  }, [moduleId, session])

  const handleSaveConversation = async (conversation: any) => {
    if (!session?.user?.id) return

    const supabase = createClient()
    try {
      const { data: studySession, error: sessionError } = await supabase
        .from('study_sessions')
        .select('id')
        .eq('module_title', moduleId)
        .single()

      if (sessionError) throw sessionError

      const { error: saveError } = await supabase
        .from('virtual_chats')
        .insert({
          study_session_id: studySession.id,
          user_id: session.user.id,
          conversation: conversation
        })

      if (saveError) throw saveError

      setChatHistory(conversation)
    } catch (error) {
      console.error('Error saving conversation:', error)
    }
  }

  if (isLoadingAuth || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect in useRequireAuth
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="mb-8">
              <Link href={`/modules/${moduleId}`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Module
                </Button>
              </Link>
            </div>
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Error Loading Content</h2>
              <p className="text-red-600 dark:text-red-300">{error}</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href={`/modules/${moduleId}`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Module
                </Button>
              </Link>
            </div>
            <h2 className="text-sm font-medium text-text-light mb-2">Virtual Student Chat</h2>
            <h1 className="text-3xl font-bold text-text">{moduleTitle}</h1>
          </div>

          <div className="bg-background-card rounded-xl shadow-sm border border-border p-8">
            <div className="bg-background/50 dark:bg-background/10 p-4 rounded-lg border border-border mb-8">
              <h2 className="font-semibold mb-2 text-text">👩‍🎓 Virtual Student Tips:</h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-text-light">
                <li>The AI student will ask questions about the topic</li>
                <li>Try to explain concepts clearly and address misconceptions</li>
                <li>Use examples to illustrate your points</li>
                <li>Ask questions to check the student's understanding</li>
              </ul>
            </div>

            <ChatInterface
              initialMessage=""
              originalContent={moduleContent}
              onSaveConversation={handleSaveConversation}
              savedConversation={chatHistory}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
} 