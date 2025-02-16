import { createClient } from '@/utils/supabase/server'
import ModulesSidebarWrapper from '@/components/modules/ModulesSidebarWrapper'

export default async function ModulesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  
  // Get all modules for the demo user
  const { data: modules, error } = await supabase
    .from('study_sessions')
    .select('module_id, details')
    .eq('user_id', '11111111-1111-1111-1111-111111111111')
    .eq('session_type', 'text')
    .order('started_at', { ascending: true })

  console.log('Raw modules from database:', modules)
  console.log('Query error if any:', error)

  // Create a unique list of modules
  const uniqueModules = modules?.reduce((acc, current) => {
    const exists = acc.find(item => item.module_id === current.module_id)
    if (!exists) {
      acc.push(current)
    }
    return acc
  }, [] as typeof modules)

  console.log('Unique modules after filtering:', uniqueModules)

  return (
    <div className="flex min-h-screen">
      <ModulesSidebarWrapper modules={uniqueModules || []} />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
} 