import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { X, Plus, Sparkles, Loader2, Pencil, Trash } from 'lucide-react'

type ActiveSection = 'notes' | 'flashcards' | 'teachback' | 'formulas' | 'videos' | 'practice' | 'noteFlashcards' | 'reminders'

interface Formula {
  id: string;
  latex: string;
  formula: string;
  description?: string;
  category: string;
  is_block: boolean;
  created_at?: string;
  user_id?: string;
  study_session_id?: string;
}

interface FormulasSectionProps {
  formulas: Formula[];
  isLoadingFormulas: boolean;
  setActiveSection: (section: ActiveSection) => void;
  handleGenerateFormulas: () => void;
  handleDeleteFormula: (id: string) => void;
  setIsAddFormulaModalOpen: (isOpen: boolean) => void;
  setEditingFormula: (formula: Formula) => void;
  setNewFormula: (formula: {
    formula: string;
    latex: string;
    description: string;
    category: string;
    is_block: boolean;
  }) => void;
  renderLatex: (content: string) => string;
}

export function FormulasSection({
  formulas,
  isLoadingFormulas,
  setActiveSection,
  handleGenerateFormulas,
  handleDeleteFormula,
  setIsAddFormulaModalOpen,
  setEditingFormula,
  setNewFormula,
  renderLatex
}: FormulasSectionProps) {
  const [activeFormulaTab, setActiveFormulaTab] = useState<'categorized' | 'all'>('all')

  // Group formulas by category
  const formulasByCategory = formulas.reduce((acc, formula) => {
    const category = formula.category || 'General'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(formula)
    return acc
  }, {} as Record<string, Formula[]>)

  const formulaCategories = Object.keys(formulasByCategory).sort()

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Formula Sheet</h1>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setIsAddFormulaModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Formula
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleGenerateFormulas()}
            disabled={isLoadingFormulas}
          >
            {isLoadingFormulas ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Generate Formulas
          </Button>
          <Button 
            variant="outline"
            onClick={() => setActiveSection('notes')}
          >
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>
      </div>
      
      {isLoadingFormulas ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Generating formulas...</p>
          <p className="text-sm text-muted-foreground">Finding relevant formulas for your study materials</p>
        </div>
      ) : formulas.length > 0 ? (
        <div className="space-y-4">
          <Tabs defaultValue={activeFormulaTab} onValueChange={(value) => setActiveFormulaTab(value as 'categorized' | 'all')}>
            <TabsList>
              <TabsTrigger value="all">All Formulas</TabsTrigger>
              <TabsTrigger value="categorized">By Category</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4 mt-4">
              {formulas.map((formula, index) => (
                <Card key={formula.id || index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between">
                      <div className="formula-display w-full">
                        <div className="mb-2" dangerouslySetInnerHTML={{
                          __html: renderLatex(formula.is_block ? `$$${formula.latex}$$` : `$${formula.latex}$`)
                        }} />
                        {formula.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{formula.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col space-y-2 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingFormula(formula);
                            setNewFormula({
                              formula: formula.formula || '',
                              latex: formula.latex || '',
                              description: formula.description || '',
                              category: formula.category || 'General',
                              is_block: formula.is_block || false
                            });
                            setIsAddFormulaModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDeleteFormula(formula.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {formula.category && (
                      <Badge variant="outline" className="mt-2">
                        {formula.category}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="categorized" className="space-y-6 mt-4">
              {formulaCategories.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {formulaCategories.map((category) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="font-medium text-lg">
                        {category} ({formulasByCategory[category]?.length || 0})
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {formulasByCategory[category]?.map((formula, index) => (
                          <Card key={formula.id || index} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex justify-between">
                                <div className="formula-display w-full">
                                  <div className="mb-2" dangerouslySetInnerHTML={{
                                    __html: renderLatex(formula.is_block ? `$$${formula.latex}$$` : `$${formula.latex}$`)
                                  }} />
                                  {formula.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{formula.description}</p>
                                  )}
                                </div>
                                <div className="flex flex-col space-y-2 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setEditingFormula(formula);
                                      setNewFormula({
                                        formula: formula.formula || '',
                                        latex: formula.latex || '',
                                        description: formula.description || '',
                                        category: formula.category || 'General',
                                        is_block: formula.is_block || false
                                      });
                                      setIsAddFormulaModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleDeleteFormula(formula.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-center py-10 text-gray-500">No categories found</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No formulas found. Add formulas manually or generate them from your notes.</p>
            <div className="mt-4 flex gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={() => setIsAddFormulaModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Manually
              </Button>
              <Button 
                onClick={() => handleGenerateFormulas()}
                disabled={isLoadingFormulas}
              >
                {isLoadingFormulas ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Generate Formulas
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 