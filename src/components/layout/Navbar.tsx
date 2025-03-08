'use client'

import Link from 'next/link'
import { BookOpen, LogOut, LineChart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  showSignOut?: boolean;
}

export default function Navbar({ showSignOut = true }: NavbarProps) {
  const { session } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    } else {
      // Redirect to login page after successful sign out
      router.push('/login?from=signout')
    }
  }

  return (
    <header className="fixed top-0 w-full bg-background-card/80 backdrop-blur-sm border-b border-border z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">
              Academiq
            </span>
          </Link>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center space-x-4">
            {session ? (
              // Authenticated navigation items
              <>
                <Link href="/modules" className="text-gray-700 dark:text-white hover:text-primary">Modules</Link>
                <Link href="/insights" className="text-gray-700 dark:text-white hover:text-primary flex items-center gap-1">
                  <LineChart className="h-4 w-4" />
                  Insights
                </Link>
                <ThemeToggle />
                {showSignOut && (
                  <Button 
                    variant="ghost" 
                    className="text-gray-700 dark:text-white hover:text-primary flex items-center gap-2"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                )}
              </>
            ) : (
              // Unauthenticated navigation items
              <>
                <ThemeToggle />
                <Link href="/login">
                  <Button variant="default" className="gap-2">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
} 