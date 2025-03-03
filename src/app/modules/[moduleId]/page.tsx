// This is now a Server Component
// (Removing 'use client' directive)
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import UnifiedModulePage from '@/components/modules/UnifiedModulePage'

interface PageProps {
  params: Promise<{ moduleId: string }>
}

export default async function ModuleDetailPage({ params }: PageProps) {
  // In Next.js 15, we need to await the params
  const paramsCopy = await params;
  const moduleId = paramsCopy.moduleId;
  
  const supabase = await createClient()
  
  // Get authenticated user using getUser() for better security instead of getSession()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Authentication error:', userError)
    redirect('/login?next=/modules')
  }
  
  // Get module details - using study_sessions table instead of modules
  const { data: moduleData, error: moduleError } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('id', moduleId)
    .eq('user_id', user.id)
    .single()
  
  if (moduleError || !moduleData) {
    console.error('Error fetching module:', moduleError)
    redirect('/modules')
  }
  
  // Get study sessions
  const { data: allSessions } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('module_id', moduleId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  // Get notes
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('*')
    .eq('study_session_id', moduleId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  if (notesError) {
    console.error('Error fetching notes:', notesError)
  }
  
  // Check if user is premium
  const { data: subscriptionData } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  
  const isPremiumUser = !!subscriptionData
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnifiedModulePage
        module={moduleData}
        _allSessions={allSessions || []}
        notes={notes || []}
        isPremiumUser={isPremiumUser}
        userId={user.id}
      />
    </Suspense>
  )
} 