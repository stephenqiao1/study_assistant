'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Trash2, AlertCircle, Mail, X } from 'lucide-react'
import CreateModuleModal from '@/components/modules/CreateModuleModal'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/components/ui/use-toast'
import { useSearchParams } from 'next/navigation'

interface Module {
  module_title: string
  details: {
    title: string
    content: string
    teach_backs?: Array<{
      grade: number
      timestamp: string
    }>
  }
  started_at: string
}

// Client component that safely uses search params
function SearchParamsHandler() {
  const searchParams = useSearchParams();
  const { session, isLoading: _isLoadingAuth } = useRequireAuth();
  const supabase = createClient();
  const { toast } = useToast();
  const [bypassLoginProcessing, setBypassLoginProcessing] = useState(false);
  
  useEffect(() => {
    const handleBypassVerification = async () => {
      if (session) return; // User is already logged in
      
      const bypassVerification = searchParams.get('bypassVerification')
      if (bypassVerification !== 'true') return;
      
      // Get the pending login details
      const pendingLoginStr = sessionStorage.getItem('pendingLogin')
      if (!pendingLoginStr) return;
      
      try {
        setBypassLoginProcessing(true);
        const pendingLogin = JSON.parse(pendingLoginStr);
        
        // Attempt login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: pendingLogin.email,
          password: pendingLogin.password
        });
        
        if (error) {
          if (error.message === 'Email not confirmed') {
            // This is expected - we're bypassing verification
            // We'll continue and let the verification banner handle it
          } else {
            throw error;
          }
        }
        
        if (data?.session) {
          // Login succeeded - set the session
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          
          // Clear the URL parameter but keep the unverified email
          window.history.replaceState({}, document.title, '/modules');
          
          toast({
            title: "Logged in successfully",
            description: "Welcome to Academiq",
          });
        }
      } catch (error) {
        console.error('Error during bypass verification login:', error);
        toast({
          title: "Login failed",
          description: error instanceof Error ? error.message : "Please try logging in again",
          variant: "destructive"
        });
        
        // Redirect back to login page
        window.location.href = '/login';
      } finally {
        // Clean up
        sessionStorage.removeItem('pendingLogin');
        setBypassLoginProcessing(false);
      }
    };
    
    handleBypassVerification();
  }, [searchParams, supabase.auth, session, toast]);

  return <>{bypassLoginProcessing && <div className="flex justify-center items-center min-h-screen">Processing login...</div>}</>;
}

// Main component
export default function ModulesPage() {
  const { session, isLoading, isEmailVerified } = useRequireAuth()
  const [modules, setModules] = useState<Module[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showVerificationBanner, setShowVerificationBanner] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState("")
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  // Check for unverified email
  useEffect(() => {
    // Check for stored unverified email from login attempts
    const storedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('unverifiedEmail') : null;
    
    if (storedEmail) {
      setUnverifiedEmail(storedEmail);
      setShowVerificationBanner(true);
    } else if (session && !isEmailVerified) {
      // If session exists but email is not verified
      setUnverifiedEmail(session.user.email || "");
      setShowVerificationBanner(true);
    } else {
      setShowVerificationBanner(false);
    }
  }, [session, isEmailVerified]);

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    setIsSendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unverifiedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/modules`,
        }
      });

      if (error) throw error;
      
      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification link.",
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast({
        title: "Error sending verification email",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const dismissVerificationBanner = () => {
    setShowVerificationBanner(false);
    // Clear from sessionStorage too
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('unverifiedEmail');
    }
  };

  const fetchModules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('module_title, details, started_at')
        .order('started_at', { ascending: false })

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      // Create a map to store unique modules with their latest data
      const moduleMap = new Map<string, Module>()
      data.forEach((module: Module) => {
        if (!moduleMap.has(module.module_title) || 
            new Date(module.started_at) > new Date(moduleMap.get(module.module_title)!.started_at)) {
          moduleMap.set(module.module_title, module)
        }
      })

      // Convert map values to array
      setModules(Array.from(moduleMap.values()))
    } catch (error) {
      console.error('Error fetching modules:', error)
    } finally {
      setIsLoadingData(false)
    }
  }, [supabase])

  useEffect(() => {
    if (session) {
      fetchModules()
    }
  }, [session, fetchModules])

  const handleCreateSuccess = () => {
    // Refresh the modules list after creating a new module
    fetchModules()
  }

  const handleDeleteClick = (moduleTitle: string) => {
    setModuleToDelete(moduleTitle)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!moduleToDelete || !session?.user?.id) return

    setIsDeleting(true)
    try {
      const supabase = createClient()
      
      // Delete all study sessions with this module title
      // This will cascade delete related data due to foreign key constraints
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('module_title', moduleToDelete)
        .eq('user_id', session.user.id)

      if (error) {
        throw error
      }

      // Success - remove from local state
      setModules(modules.filter(m => m.module_title !== moduleToDelete))
      toast({
        title: "Module deleted",
        description: "The module and all related data have been removed.",
      })
    } catch (error) {
      console.error('Error deleting module:', error)
      toast({
        title: "Error deleting module",
        description: "There was a problem deleting the module. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setDeleteConfirmOpen(false)
      setModuleToDelete(null)
    }
  }

  if (isLoading || isLoadingData) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect in useRequireAuth
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Wrap SearchParams handler in Suspense */}
      <Suspense fallback={null}>
        <SearchParamsHandler />
      </Suspense>
      
      <Navbar />

      {showVerificationBanner && (
        <div className="bg-amber-500 dark:bg-amber-700 text-white p-3">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>
                Your email {unverifiedEmail} is not verified. Some features may be limited.
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent text-white border-white hover:bg-white/20"
                onClick={handleResendVerification}
                disabled={isSendingVerification}
              >
                <Mail className="h-4 w-4 mr-1" />
                {isSendingVerification ? "Sending..." : "Resend Verification"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={dismissVerificationBanner}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={`container mx-auto px-4 ${showVerificationBanner ? 'pt-20' : 'pt-24'} pb-8`}>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-text">Study Modules</h1>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Module
            </Button>
          </div>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <Card key={module.module_title} className="bg-background-card border-border">
                <CardHeader>
                  <CardTitle className="text-text">{module.details.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-text-light">
                      Started: {new Date(module.started_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Link
                    href={`/modules/${module.module_title}`}
                    className={buttonVariants({ variant: "default" })}
                  >
                    View Module
                  </Link>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteClick(module.module_title)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Footer />

      {/* Create Module Modal */}
      <CreateModuleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this module? This will permanently remove the module
              and all its content, including notes, flashcards, and teach-back sessions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center text-text">
            <AlertDialogCancel className="border-border hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Module"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 