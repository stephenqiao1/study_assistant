'use client'

import { useState, useEffect, useCallback, useMemo, use, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
import { Badge as _Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader as _CardHeader, CardFooter as _CardFooter } from '@/components/ui/card'
import _Link from 'next/link'
import { ArrowLeft, RefreshCcw, Download, Lightbulb as _Lightbulb, Loader2, Plus, Crown, BookOpen as _BookOpen, FileText, Sparkles } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useStudyDuration } from '@/hooks/useStudyDuration'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Pluggable } from 'unified'
import FormulaStyles from '@/components/modules/FormulaStyles'
import 'katex/dist/katex.min.css'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { isPremiumUser } from '@/utils/subscription-helpers'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface PageProps {
  params: Promise<{ moduleId: string }>
}

interface FormulaType {
  id: string
  formula: string
  latex: string
  description: string
  category: string
  is_block: boolean
  source_note_id: string
  notes: {
    title: string
  } | null
}

function InvalidModuleIdError({ moduleId, moduleTitle, onBack }: { moduleId: string, moduleTitle?: string, onBack: () => void }) {
  return (
    <Card className="bg-background-card p-8 text-center max-w-3xl mx-auto">
      <div className="flex flex-col items-center justify-center py-8">
        <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3 mb-4">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            className="h-10 w-10 text-red-600 dark:text-red-400"
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Invalid Module ID</h2>
        {moduleTitle && <p className="text-sm text-text-light mb-3">Module: {moduleTitle}</p>}
        <p className="text-text-light mb-6 max-w-md">
          The module ID "{moduleId}" is not in a valid format. Module IDs must be in UUID format.
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-6 text-left w-full max-w-md">
          <h3 className="text-sm font-medium mb-2">Supported UUID Format:</h3>
          <code className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">
            xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
          </code>
          <p className="text-xs mt-2 text-text-light">
            Example: 123e4567-e89b-12d3-a456-426614174000
          </p>
        </div>
        <Button onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Go Back to Modules
        </Button>
      </div>
    </Card>
  )
}

export default function FormulaSheetPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { moduleId } = resolvedParams;
  
  // React hooks must be called at the top level of the component
  const { session: _session, isLoading: isLoadingAuth } = useRequireAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [formulas, setFormulas] = useState<FormulaType[]>([]);
  const [categorizedFormulas, setCategorizedFormulas] = useState<Record<string, FormulaType[]>>({});
  const [isPremium, setIsPremium] = useState(false);
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
  const [_premiumFeatureAttempted, setPremiumFeatureAttempted] = useState<string>('');
  const hasInitiatedFetch = useRef(false);
  
  // Quick check for undefined or 'undefined' moduleId
  const shouldRedirect = !moduleId || moduleId === 'undefined';
  
  // Memoize the moduleId to ensure it remains stable
  const stableModuleId = useMemo(() => moduleId, [moduleId]);
  
  // Add early UUID validation to check moduleId
  const isValidUuid = useMemo(() => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return stableModuleId && uuidPattern.test(stableModuleId);
  }, [stableModuleId]);
  
  const searchParams = useMemo(() => {
    return new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  }, []);
  
  // Track study duration with the moduleId (which is now the study session ID)
  useStudyDuration(isValidUuid ? stableModuleId : '', 'module');
  
  // Effect for client-side redirect
  useEffect(() => {
    if (shouldRedirect && typeof window !== 'undefined') {
      window.location.href = '/modules';
    }
  }, [shouldRedirect]);
  
  // Only show a warning toast for invalid moduleIds during development
  useEffect(() => {
    if (!isValidUuid && stableModuleId && process.env.NODE_ENV === 'development') {
      console.warn(`Non-UUID format moduleId detected: ${stableModuleId}. Database operations will fail.`);
    }
  }, [isValidUuid, stableModuleId]);
  
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) return
        
        const premiumStatus = await isPremiumUser(session.user.id)
        setIsPremium(premiumStatus)
      } catch (_error) {
        // Ignore premium check errors, default to false
        console.error("Failed to check premium status:", _error);
        setIsPremium(false)
      }
    }
    
    if (isValidUuid) {
      checkPremiumStatus()
    }
  }, [isValidUuid]);
  
  const fetchFormulas = useCallback(async (currentModuleId: string) => {
    setIsLoading(true)
    try {
      // Skip database operations for invalid UUIDs
      if (!isValidUuid) {
        setFormulas([]);
        setIsLoading(false);
        return;
      }
      
      const supabase = await createClient();
      const { data, error: fetchError } = await supabase
        .from('formulas')
        .select('*')
        .eq('study_session_id', currentModuleId)
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      
      const uniqueFormulas = Array.from(
        new Map(data.map((formula: FormulaType) => [formula.latex, formula])).values()
      )
      
      setFormulas(uniqueFormulas as FormulaType[])
    } catch (_error) {
      // Log error for debugging purposes
      console.error("Failed to fetch formulas:", _error);
      toast({
        title: "Error fetching formulas",
        description: "Unable to load your formulas. Please refresh the page.",
        variant: "destructive"
      })
      setFormulas([])
    } finally {
      setIsLoading(false)
    }
  }, [toast, isValidUuid]);
  
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user?.id) {
          router.push('/login')
          return
        }
        
        // Always set moduleTitle from URL params
        const titleFromURL = searchParams.get('title')
        setModuleTitle(titleFromURL || 'Untitled Module')
        
        // Now fetch formulas using the moduleId (which is the study session ID)
        // Only fetch once to avoid potential infinite loops
        if (stableModuleId && isValidUuid && !hasInitiatedFetch.current) {
          hasInitiatedFetch.current = true;
          fetchFormulas(stableModuleId)
        }
      } catch (_error) {
        // Log authentication error
        console.error("Session loading error:", _error);
        toast({
          title: "Error loading session",
          description: "Please try logging in again.",
          variant: "destructive"
        })
        setIsLoading(false);
      }
    }
    
    fetchSessionData()
  }, [router, searchParams, fetchFormulas, toast, stableModuleId, isValidUuid])
  
  useEffect(() => {
    const categorized: Record<string, FormulaType[]> = {}
    
    formulas.forEach(formula => {
      if (!categorized[formula.category]) {
        categorized[formula.category] = []
      }
      categorized[formula.category].push(formula)
    })
    
    setCategorizedFormulas(categorized)
  }, [formulas])
  
  const handleGenerateFormulas = async () => {
    if (!isPremium) {
      setPremiumFeatureAttempted('formula_generation')
      showPremiumDialog()
      return
    }
    
    if (!isValidUuid) {
      toast({
        title: "Invalid Module ID",
        description: "Cannot generate formulas for this module due to an invalid ID format.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true)
    try {
      const _supabase = await createClient();
      const moduleData = await getModuleData(stableModuleId)
      
      if (moduleData) {
        const response = await fetch('/api/ai/extract-formulas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ study_session_id: stableModuleId, moduleContent: moduleData }),
        })
        
        if (!response.ok) throw new Error('Failed to generate formulas')
        
        await fetchFormulas(stableModuleId)
      } else {
        toast({
          title: "No formulas found",
          description: "No mathematical formulas were found in your notes. Try adding equations using LaTeX syntax ($...$).",
        })
      }
    } catch (_error) {
      console.error("Error generating formula sheet:", _error);
      toast({
        title: "Error generating formula sheet",
        description: "An error occurred while generating the formula sheet.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  const getModuleData = async (sessionId: string) => {
    try {
      // Skip database operations for invalid UUIDs
      if (!isValidUuid) {
        return null;
      }
      
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('notes')
        .select('content')
        .eq('study_session_id', sessionId)
      
      if (error) {
        console.error('Error fetching module notes:', error)
        return null
      }
      
      if (data && data.length > 0) {
        return data.map(note => note.content).join('\n\n')
      }
      
      return null
    } catch (_error) {
      // Log module data error 
      console.error('Error in getModuleData:', _error)
      return null
    }
  }
  
  const handleRegenerateDescriptions = async () => {
    if (!isPremium) {
      setPremiumFeatureAttempted('description_regeneration')
      showPremiumDialog()
      return
    }
    
    if (formulas.length === 0) {
      toast({
        title: "No formulas to update",
        description: "Generate a formula sheet first before updating descriptions.",
      })
      return
    }
    
    if (!isValidUuid) {
      toast({
        title: "Invalid Module ID",
        description: "Cannot update formulas for this module due to an invalid ID format.",
        variant: "destructive"
      });
      return;
    }
    
    setIsRegenerating(true)
    try {
      const _supabase = await createClient();
      const response = await fetch('/api/ai/regenerate-descriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ study_session_id: stableModuleId, formulas }),
      })
      
      if (response.ok) {
        toast({
          title: "Descriptions updated",
          description: "Formula descriptions have been updated successfully.",
        })
        
        await fetchFormulas(stableModuleId)
      } else {
        toast({
          title: "No descriptions updated",
          description: "Unable to update formula descriptions. Please try again.",
        })
      }
    } catch (_error) {
      // Log error when updating descriptions
      console.error("Error updating formula descriptions:", _error);
      toast({
        title: "Error updating descriptions",
        description: "An error occurred while updating formula descriptions.",
        variant: "destructive"
      })
    } finally {
      setIsRegenerating(false)
    }
  }
  
  const handleExport = () => {
    window.print()
  }
  
  const handleGoBack = () => {
    router.push('/modules')
  }
  
  const categories = [...new Set(formulas.map(f => f.category))].sort()
  
  const formulasByCategory = categories.reduce((acc, category) => {
    acc[category] = formulas.filter(f => f.category === category)
    return acc
  }, {} as Record<string, FormulaType[]>)
  
  if (isLoadingAuth || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  const showPremiumDialog = () => {
    setIsPremiumDialogOpen(true)
  }

  // If the moduleId is invalid and we're not redirecting, show custom error
  if (!shouldRedirect && !isValidUuid && !isLoadingAuth && !isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-8">
          <div className="max-w-6xl mx-auto px-4">
            <InvalidModuleIdError moduleId={moduleId} moduleTitle={moduleTitle} onBack={handleGoBack} />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Button variant="ghost" onClick={handleGoBack} className="p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl md:text-3xl font-bold text-text-heading">Formula Sheet</h1>
              </div>
              {moduleTitle && (
                <p className="text-lg text-text-light ml-10">
                  {moduleTitle}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center space-x-2">
              {isPremium ? (
                <Button variant="outline" onClick={handleRegenerateDescriptions} disabled={isRegenerating} className="gap-2">
                  <RefreshCcw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {isRegenerating ? 'Updating...' : 'Regenerate Descriptions'}
                </Button>
              ) : (
                <Button variant="outline" onClick={showPremiumDialog} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Descriptions
                  <Crown className="h-3 w-3 ml-1" />
                </Button>
              )}
              
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>

          {formulas.length === 0 ? (
            <Card className="bg-background-card p-8 text-center shadow-sm border-border">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-background-secondary p-4 mb-6">
                  <FileText className="h-10 w-10 text-text-light" />
                </div>
                <h3 className="text-xl font-bold mb-3">No Formulas Found</h3>
                <p className="text-text-light max-w-md mx-auto mb-8">
                  Your formula sheet will automatically extract mathematical equations from your notes.
                  Add equations to your notes using LaTeX syntax ($...$) and then generate your formula sheet.
                </p>
                <Button onClick={handleGenerateFormulas} disabled={isGenerating || !isValidUuid} className="gap-2">
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Formula Sheet
                    </>
                  )}
                  {!isPremium && <Crown className="h-3 w-3 ml-1" />}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-8 print:space-y-6">
              <div className="hidden print:block mb-8">
                <h1 className="text-2xl font-bold text-center">{moduleTitle} - Formula Sheet</h1>
                <p className="text-center text-text-light">
                  Generated on {new Date().toLocaleDateString()}
                </p>
              </div>
              
              <Tabs defaultValue="categorized" className="print:hidden">
                <div className="mb-6 bg-background-secondary p-1 rounded-lg inline-block">
                  <TabsList className="bg-transparent">
                    <TabsTrigger value="categorized" className="data-[state=active]:bg-background-card data-[state=active]:shadow-sm">By Category</TabsTrigger>
                    <TabsTrigger value="all" className="data-[state=active]:bg-background-card data-[state=active]:shadow-sm">Full List</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="categorized" className="mt-6">
                  {categories.length > 0 ? (
                    <Accordion type="single" collapsible className="mt-4 space-y-4">
                      {categories.map(category => (
                        <AccordionItem key={category} value={category} className="border-border bg-background-card rounded-lg overflow-hidden shadow-sm">
                          <AccordionTrigger className="text-lg font-medium px-6 py-4 hover:bg-muted/30 data-[state=open]:bg-muted/20">
                            {category} <span className="ml-2 text-xs text-muted-foreground">({formulasByCategory[category].length})</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-6 pb-6 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                              {formulasByCategory[category].map(formula => (
                                <FormulaCard key={formula.id} formula={formula} />
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-8 bg-background-card rounded-lg border border-border p-6">
                      <p>No categorized formulas found. Generate a formula sheet to get started.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="all" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {formulas.length > 0 ? (
                      formulas.map(formula => (
                        <FormulaCard key={formula.id} formula={formula} />
                      ))
                    ) : (
                      <div className="text-center py-8 bg-background-card rounded-lg border border-border p-6 col-span-full dark:text-white">
                        <p>No formulas found. Generate a formula sheet to get started.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="hidden print:block">
                {Object.entries(categorizedFormulas).map(([category, categoryFormulas]) => (
                  <div key={category} className="mb-8">
                    <h2 className="text-xl font-bold border-b pb-2 mb-4">{category}</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {categoryFormulas.map(formula => (
                        <div key={formula.id} className="border p-4 rounded">
                          <div className="formula-display mb-2">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath as Pluggable]}
                              rehypePlugins={[rehypeKatex as Pluggable]}
                            >
                              {formula.is_block ? `$$${formula.latex}$$` : `$${formula.latex}$`}
                            </ReactMarkdown>
                          </div>
                          {formula.description && (
                            <p className="text-sm text-text-light">{formula.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      
      {/* Premium upgrade dialog */}
      <AlertDialog open={isPremiumDialogOpen} onOpenChange={setIsPremiumDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upgrade to Premium</AlertDialogTitle>
            <AlertDialogDescription>
              AI-powered description generation for formulas is a premium feature. Upgrade your account to access this and other premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/pricing')}>
              View Premium Plans
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <FormulaStyles />
    </div>
  )
}

function FormulaCard({ formula }: { formula: FormulaType }) {
  return (
    <Card className="bg-background-card border-border overflow-hidden hover:shadow-md transition-all">
      <CardContent className="p-5">
        <div className="flex flex-col space-y-3">
          <div className="formula-display mb-2 overflow-x-auto">
            <ReactMarkdown
              remarkPlugins={[remarkMath as Pluggable]}
              rehypePlugins={[rehypeKatex as Pluggable]}
            >
              {formula.is_block ? `$$${formula.latex}$$` : `$${formula.latex}$`}
            </ReactMarkdown>
          </div>
          {formula.description && (
            <p className="text-sm text-text-light">{formula.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}