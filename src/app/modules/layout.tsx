import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function ModulesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
} 