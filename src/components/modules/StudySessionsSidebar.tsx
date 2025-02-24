import { FC } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface StudySession {
  id: string
  started_at: string
  details: {
    title: string
  }
  module_title: string
}

interface StudySessionsSidebarProps {
  sessions: StudySession[]
}

const StudySessionsSidebar: FC<StudySessionsSidebarProps> = ({ sessions }) => {
  const pathname = usePathname()

  // Group sessions by module_title
  const groupedSessions = sessions.reduce((acc, session) => {
    if (!acc[session.module_title]) {
      acc[session.module_title] = []
    }
    acc[session.module_title].push(session)
    return acc
  }, {} as Record<string, typeof sessions>)

  return (
    <aside className="w-64 h-full bg-background-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-text">Modules</h2>
        <p className="text-sm text-text-light mt-1">Your study modules</p>
      </div>
      <div className="p-4">
        <nav className="space-y-2">
          {Object.entries(groupedSessions).map(([title, moduleSessions]) => (
            <Link
              key={title}
              href={`/modules/${title}`}
              className={`block px-4 py-2 rounded-lg transition-colors ${
                pathname === `/modules/${title}`
                  ? 'bg-primary/10 text-primary'
                  : 'text-text hover:bg-background dark:hover:bg-background/5'
              }`}
            >
              {moduleSessions[0].details.title}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}

export default StudySessionsSidebar 