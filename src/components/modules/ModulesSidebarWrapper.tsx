'use client'

import { usePathname } from 'next/navigation'
import ModulesSidebar from './ModulesSidebar'

interface ModulesSidebarWrapperProps {
  modules: Array<{
    module_id: string
    details: {
      title: string
    }
  }>
}

export default function ModulesSidebarWrapper({ modules }: ModulesSidebarWrapperProps) {
  const pathname = usePathname()
  const isMainModulesPage = pathname === '/modules'

  if (isMainModulesPage) {
    return null
  }

  return (
    <div className="sticky top-0 h-screen flex-shrink-0">
      <ModulesSidebar modules={modules} />
    </div>
  )
} 