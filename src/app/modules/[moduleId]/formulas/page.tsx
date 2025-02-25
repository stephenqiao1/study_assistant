'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, RefreshCcw, Download, Lightbulb, Loader2, Plus, Crown } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useStudyDuration } from '@/hooks/useStudyDuration'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
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

export default function FormulaSheetPage({ params }: PageProps) {
  const { moduleId } = use(params)
  const { isLoading: isLoadingAuth } = useRequireAuth()
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  
  const searchParams = useMemo(() => {
    return new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  }, [])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [moduleTitle, setModuleTitle] = useState('')
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [formulas, setFormulas] = useState<FormulaType[]>([])
  const [categorizedFormulas, setCategorizedFormulas] = useState<Record<string, FormulaType[]>>({})
  const [isPremium, setIsPremium] = useState(false)
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false)
  const [premiumFeatureAttempted, setPremiumFeatureAttempted] = useState<string>('')
  
  useStudyDuration(studySessionId || '', 'module')
  
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
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
    
    checkPremiumStatus()
  }, [supabase])
  
  const fetchFormulas = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('formulas')
        .select('*')
        .eq('module_id', moduleId)
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
  }, [moduleId, supabase, toast])
  
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user?.id) {
          router.push('/login')
          return
        }
        
        setStudySessionId(session.user.id)
        setModuleTitle(searchParams.get('title') || 'Untitled Module')
        fetchFormulas()
      } catch (_error) {
        // Log authentication error
        console.error("Session loading error:", _error);
        toast({
          title: "Error loading session",
          description: "Please try logging in again.",
          variant: "destructive"
        })
      }
    }
    
    fetchSessionData()
  }, [router, searchParams, fetchFormulas, supabase, toast])
  
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
    
    setIsGenerating(true)
    try {
      const moduleData = await getModuleData(moduleId)
      
      if (moduleData) {
        const response = await fetch('/api/ai/extract-formulas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ moduleId, moduleContent: moduleData }),
        })
        
        if (!response.ok) throw new Error('Failed to generate formulas')
        
        await fetchFormulas()
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
  
  const getModuleData = async (moduleId: string) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('content')
        .eq('module_id', moduleId)
      
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
    
    setIsRegenerating(true)
    try {
      const response = await fetch('/api/ai/regenerate-descriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ moduleId, formulas }),
      })
      
      if (response.ok) {
        toast({
          title: "Descriptions updated",
          description: "Formula descriptions have been updated successfully.",
        })
        
        await fetchFormulas()
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <FormulaStyles />
      
      <AlertDialog open={isPremiumDialogOpen} onOpenChange={setIsPremiumDialogOpen}>
        <AlertDialogContent className="bg-background border-border shadow-lg !bg-opacity-100" style={{ backgroundColor: 'var(--background)', backdropFilter: 'none' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Premium Feature</AlertDialogTitle>
            <AlertDialogDescription>
              {premiumFeatureAttempted} is a premium feature. Upgrade to a premium plan to access AI-powered formula features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/pricing')}>
              View Pricing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="pt-24 pb-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href={`/modules/${moduleId}`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Module
                </Button>
              </Link>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-medium text-text-light mb-2">Formula Sheet</h2>
                <h1 className="text-3xl font-bold text-text">{moduleTitle}</h1>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                <Button 
                  onClick={handleGenerateFormulas} 
                  disabled={isGenerating || isRegenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isGenerating ? 'Generating...' : 'Generate Formula Sheet'}
                  {!isPremium && <Crown className="h-3 w-3 ml-1" />}
                </Button>
                
                {formulas.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={handleRegenerateDescriptions} 
                    disabled={isRegenerating || isGenerating}
                    className="gap-2"
                  >
                    {isRegenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    {isRegenerating ? 'Updating...' : 'AI Descriptions'}
                    {!isPremium && <Crown className="h-3 w-3 ml-1" />}
                  </Button>
                )}
                
                <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>

          {formulas.length === 0 ? (
            <Card className="bg-background-card p-6 text-center">
              <div className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="h-12 w-12 text-text-light mb-4" />
                <h3 className="text-xl font-bold mb-2">No Formulas Found</h3>
                <p className="text-text-light max-w-md mx-auto mb-6">
                  Your formula sheet will automatically extract mathematical equations from your notes.
                  Add equations to your notes using LaTeX syntax ($...$) and then generate your formula sheet.
                </p>
                <Button onClick={handleGenerateFormulas} disabled={isGenerating} className="gap-2">
                  {isGenerating ? 'Generating...' : 'Generate Formula Sheet'}
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
                <TabsList>
                  <TabsTrigger value="categorized">By Category</TabsTrigger>
                  <TabsTrigger value="all">Full List</TabsTrigger>
                </TabsList>
                
                <TabsContent value="categorized">
                  {categories.length > 0 ? (
                    <Accordion type="single" collapsible className="mt-4">
                      {categories.map(category => (
                        <AccordionItem key={category} value={category}>
                          <AccordionTrigger className="text-lg font-medium dark:text-white">
                            {category} <span className="ml-2 text-xs text-muted-foreground">({formulasByCategory[category].length})</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-1 gap-4 mt-2">
                              {formulasByCategory[category].map(formula => (
                                <FormulaCard key={formula.id} formula={formula} />
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-8">
                      <p>No formulas found. Generate a formula sheet to get started.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="all">
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    {formulas.length > 0 ? (
                      formulas.map(formula => (
                        <FormulaCard key={formula.id} formula={formula} />
                      ))
                    ) : (
                      <div className="text-center py-8 dark:text-white">
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
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {formula.is_block ? `$$${formula.latex}$$` : `$${formula.latex}$`}
                            </ReactMarkdown>
                          </div>
                          {formula.description && (
                            <p className="text-sm text-text-light">{formula.description}</p>
                          )}
                          {formula.notes && (
                            <p className="text-xs mt-2">
                              Source: {formula.notes.title}
                            </p>
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
    </div>
  )
}

function FormulaCard({ formula }: { formula: FormulaType }) {
  return (
    <Card className="bg-background-card p-4 overflow-x-auto dark:shadow-md dark:border-gray-700">
      <div className="formula-display mb-3">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {formula.is_block ? `$$${formula.latex}$$` : `$${formula.latex}$`}
        </ReactMarkdown>
      </div>
      {formula.description && (
        <p className="text-sm font-medium text-text dark:text-white">{formula.description}</p>
      )}
      <div className="flex items-center justify-between mt-3">
        <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-100">{formula.category}</Badge>
        {formula.notes && (
          <span className="text-xs text-text-light dark:text-gray-300">Source: {formula.notes.title}</span>
        )}
      </div>
    </Card>
  )
}

function FormulaStyles() {
  return (
    <style jsx global>{`
      .dark .katex,
      .dark .katex-display,
      .dark .katex .base,
      .dark .katex .strut,
      .dark .katex .mathit,
      .dark .katex .mathnormal,
      .dark .katex .mathbf,
      .dark .katex .amsrm,
      .dark .katex .textstyle > .mord,
      .dark .katex .textstyle > .mord > .mord,
      .dark .katex .textstyle > .mord > .mord > .mord,
      .dark .katex .textstyle > .mord > .mord > .mord > .mord,
      .dark .katex .textstyle > .mord > .mord > .mord > .mord > .mord,
      .dark .katex .mbin,
      .dark .katex .mrel,
      .dark .katex .mopen,
      .dark .katex .mclose,
      .dark .katex .mpunct,
      .dark .katex .minner,
      .dark .katex .mop,
      .dark .katex .mord.text,
      .dark .katex .mspace {
        color: white !important;
      }
      
      .dark .katex .frac-line {
        border-color: white !important;
      }
      
      .dark .katex .sqrt > .sqrt-sign {
        color: white !important;
      }
      
      .dark .katex .accent > .accent-body {
        color: white !important;
      }
      
      .dark .formula-display {
        color: white !important;
      }
      
      .dark .katex .overline .overline-line {
        border-top-color: white !important;
      }
      
      .dark .katex .underline .underline-line {
        border-bottom-color: white !important;
      }
      
      .dark .katex .stretchy {
        border-color: white !important;
        color: white !important;
      }
    `}</style>
  )
}
