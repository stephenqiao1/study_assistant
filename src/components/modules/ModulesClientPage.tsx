'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Trash2, AlertCircle, Mail, X, Edit } from 'lucide-react'
import CreateModuleModal from '@/components/modules/CreateModuleModal'
import EditModuleModal from '@/components/modules/EditModuleModal'
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
  AlertDialogPortal,
  AlertDialogOverlay,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface Module {
  id: string
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

interface ModulesClientPageProps {
  modules: Module[]
  isLoadingData: boolean
  isEmailVerified: boolean
  userEmail: string
}

export default function ModulesClientPage({ 
  modules: initialModules, 
  isLoadingData: initialLoading,
  isEmailVerified,
  userEmail
}: ModulesClientPageProps) {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([])
  const [isLoadingData, _setIsLoadingData] = useState(initialLoading)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [moduleToEdit, setModuleToEdit] = useState<Module | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showVerificationBanner, setShowVerificationBanner] = useState(!isEmailVerified && !!userEmail)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const hasInitialized = useRef(false);
  const supabase = createClient()
  const { toast } = useToast()

  // Initialize modules once at component mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      
      const validModules = initialModules.filter(module => !!module.id);
      setModules(validModules);
      
      if (validModules.length < initialModules.length) {
        console.warn(`Filtered out ${initialModules.length - validModules.length} modules with missing IDs`);
        toast({
          title: "Some modules may not display correctly",
          description: "We found some modules with missing IDs that have been filtered out.",
          variant: "destructive"
        });
      }
    }
  }, [initialModules, toast]); // Include dependencies but only run the filtering once

  const handleResendVerification = async () => {
    if (!userEmail) return;
    
    setIsSendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
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

  const handleCreateSuccess = () => {
    // Refresh the whole page to get the updated data from the server
    router.refresh();
  }

  const handleEditClick = (module: Module) => {
    setModuleToEdit(module);
    setShowEditModal(true);
  }

  const handleEditSuccess = (updatedModule: Module) => {
    // Update the modules state with the edited module
    setModules(prevModules => 
      prevModules.map(module => 
        module.id === updatedModule.id ? updatedModule : module
      )
    );
    
    // Also refresh the page to ensure server-side data is updated
    router.refresh();
  }

  const handleDeleteClick = (moduleId: string) => {
    setModuleToDelete(moduleId);
    setDeleteConfirmOpen(true);
  }

  const handleDeleteConfirm = async () => {
    if (!moduleToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', moduleToDelete);
      
      if (error) throw error;
      
      setModules(prev => prev.filter(module => module.id !== moduleToDelete));
      
      toast({
        title: "Module deleted",
        description: "The module has been deleted successfully"
      });
    } catch (error: unknown) {
      toast({
        title: "Error deleting module",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setModuleToDelete(null);
    }
  }

  if (isLoadingData) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {showVerificationBanner && (
        <div className="bg-amber-500 dark:bg-amber-700 text-white p-3">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>
                Your email {userEmail} is not verified. Some features may be limited.
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
            <h1 className="text-3xl font-bold text-text dark:text-white">Study Modules</h1>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Module
            </Button>
          </div>

          {/* Modules Grid */}
          {modules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {modules.map((module) => (
                <Card key={module.id} className="flex flex-col h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-semibold text-text dark:text-white">
                      {module.details?.title || module.module_title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow pb-4">
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                      Started {new Date(module.started_at).toLocaleDateString()}
                    </div>
                    
                    <p className="mt-2 text-sm text-text-light dark:text-gray-300 line-clamp-3">
                      {module.details?.content?.replace(/<[^>]*>/g, '').substring(0, 120) || 'No content yet'}...
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between items-center">
                    <Link 
                      href={`/modules/${module.id}`} 
                      className={buttonVariants({ variant: 'default' })}
                    >
                      Open
                    </Link>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          handleEditClick(module)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          handleDeleteClick(module.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center">
              <p className="text-text-light dark:text-gray-300">No modules found.</p>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Create Module Modal */}
      <CreateModuleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Module Modal */}
      <EditModuleModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={(updatedModule) => handleEditSuccess(updatedModule)}
        module={moduleToEdit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="bg-black opacity-100" />
          <AlertDialogContent className="bg-background border border-border">
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
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  )
} 