'use client'

import { FC } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen } from 'lucide-react'

interface ModulesSidebarProps {
  modules: Array<{
    module_id: string
    details: {
      title: string
    }
  }>
}

const ModulesSidebar: FC<ModulesSidebarProps> = ({ modules }) => {
  const pathname = usePathname()
  
  console.log('Modules received by sidebar:', modules)

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-semibold text-primary">Academiq</span>
        </Link>
      </div>
      <div className="p-4">
        <h2 className="text-sm font-medium text-text-light mb-4">Study Modules</h2>
        <nav className="space-y-1">
          {modules.map((module) => (
            <Link
              key={module.module_id}
              href={`/modules/${module.module_id}`}
              className={`block px-3 py-2 rounded-lg transition-colors ${
                pathname === `/modules/${module.module_id}`
                  ? 'bg-primary/10 text-primary'
                  : 'text-text hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {module.details.title}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}

export default ModulesSidebar 