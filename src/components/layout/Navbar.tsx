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
      <div className="flex h-14 items-center px-4 lg:px-6">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity mr-6">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary">
            Academiq
          </span>
        </Link>

        {/* Navigation Menu */}
        <nav className="hidden md:flex items-center gap-4 md:gap-6 flex-1 justify-end">
          {session ? (
            // Authenticated navigation items
            <>
              <Link 
                href="/modules" 
                className="text-foreground/80 hover:text-primary transition-colors font-medium"
              >
                Modules
              </Link>
              <Link 
                href="/insights" 
                className="text-foreground/80 hover:text-primary transition-colors font-medium flex items-center gap-1.5"
              >
                <LineChart className="h-4 w-4" />
                Insights
              </Link>
              <div className="h-4 w-px bg-border mx-2" />
              <ThemeToggle />
              {showSignOut && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-1.5 font-medium -mr-2"
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
                <Button variant="default" size="sm" className="gap-2">
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
} 