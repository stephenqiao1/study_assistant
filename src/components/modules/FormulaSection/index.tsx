'use client'

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { 
  Plus, 
  X, 
  Loader2, 
  Sparkles, 
  Pencil, 
  Trash 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormulaStyles from '@/components/modules/FormulaStyles';

interface Formula {
  id?: string;
  formula?: string;
  latex: string;
  description: string;
  category: string;
  is_block: boolean;
}

interface FormulaSectionProps {
  studySessionId: string;
  activeSection: string;
  renderLatex: (content: string) => string;
  onClose: () => void;
  isPremiumUser: boolean;
}

export default function FormulaSection({ 
  studySessionId, 
  activeSection, 
  renderLatex,
  onClose,
  isPremiumUser
}: FormulaSectionProps) {
  const supabase = createClient();
  const { toast } = useToast();
  
  // State for formulas
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [isLoadingFormulas, setIsLoadingFormulas] = useState(false);
  const [formulaCategories, setFormulaCategories] = useState<string[]>([]);
  const [formulasByCategory, setFormulasByCategory] = useState<Record<string, Formula[]>>({});
  const [activeFormulaTab, setActiveFormulaTab] = useState<'categorized' | 'all'>('all');
  
  // State for formula editing
  const [isAddFormulaModalOpen, setIsAddFormulaModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [newFormula, setNewFormula] = useState<Formula>({
    latex: '',
    description: '',
    category: 'General',
    is_block: false
  });
  
  // Fetch formulas from the database
  const fetchFormulas = useCallback(async () => {
    setIsLoadingFormulas(true);
    try {
      const { data, error } = await supabase
        .from('formulas')
        .select('*')
        .eq('study_session_id', studySessionId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setFormulas(data || []);
      
      // Process categories
      const categories = data
        ? Array.from(new Set(data.map(f => f.category || 'General')))
        : ['General'];
      
      setFormulaCategories(categories);
      
      // Group by category
      const byCategory: Record<string, Formula[]> = {};
      categories.forEach(category => {
        byCategory[category] = data
          ? data.filter(f => (f.category || 'General') === category)
          : [];
      });
      
      setFormulasByCategory(byCategory);
    } catch (error) {
      console.error("Error fetching formulas:", error);
      toast({
        title: "Error",
        description: "Failed to load formulas. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFormulas(false);
    }
  }, [studySessionId, supabase, toast]);
  
  // Load formulas on component mount
  useEffect(() => {
    if (activeSection === 'formulas') {
      fetchFormulas();
    }
  }, [activeSection, fetchFormulas]);
  
  // Generate formulas from the notes
  const handleGenerateFormulas = async () => {
    if (!isPremiumUser) {
      toast({
        title: "Premium Feature",
        description: "Formula generation is a premium feature. Please upgrade to access it.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoadingFormulas(true);
    try {
      // Here we would normally call an API to generate formulas
      // For now, we'll simulate it
      toast({
        title: "Generating formulas",
        description: "Our AI is analyzing your notes to extract formulas."
      });
      
      setTimeout(() => {
        const exampleFormulas = [
          {
            latex: 'E=mc^2',
            description: 'Einstein\'s mass-energy equivalence formula',
            category: 'Physics',
            is_block: false
          },
          {
            latex: '\\frac{d}{dx}[x^n] = nx^{n-1}',
            description: 'Power rule for differentiation',
            category: 'Calculus',
            is_block: true
          },
          {
            latex: 'PV = nRT',
            description: 'Ideal gas law',
            category: 'Chemistry',
            is_block: false
          }
        ];
        
        // Add these to the database
        addGeneratedFormulas(exampleFormulas);
      }, 2000);
    } catch (error) {
      console.error("Error generating formulas:", error);
      toast({
        title: "Error",
        description: "Failed to generate formulas. Please try again.",
        variant: "destructive"
      });
      setIsLoadingFormulas(false);
    }
  };
  
  // Add generated formulas to the database
  const addGeneratedFormulas = async (newFormulas: Formula[]) => {
    try {
      const formulasToInsert = newFormulas.map(formula => ({
        ...formula,
        study_session_id: studySessionId
      }));
      
      const { error: insertError } = await supabase
        .from('formulas')
        .insert(formulasToInsert)
        .select();
        
      if (insertError) throw insertError;
      
      // Refresh formulas
      fetchFormulas();
      
      toast({
        title: "Formulas generated",
        description: `${newFormulas.length} formulas have been added to your formula sheet.`
      });
    } catch (error) {
      console.error("Error adding generated formulas:", error);
      toast({
        title: "Error",
        description: "Failed to save generated formulas. Please try again.",
        variant: "destructive"
      });
      setIsLoadingFormulas(false);
    }
  };
  
  // Handle adding a new formula
  const handleAddFormula = async () => {
    if (!newFormula.latex) {
      toast({
        title: "Missing information",
        description: "Please enter a LaTeX formula.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const formulaToSave = {
        ...newFormula,
        study_session_id: studySessionId
      };
      
      if (editingFormula?.id) {
        // Update existing formula
        const { error } = await supabase
          .from('formulas')
          .update(formulaToSave)
          .eq('id', editingFormula.id);
          
        if (error) throw error;
        
        toast({
          title: "Formula updated",
          description: "Your formula has been updated successfully."
        });
      } else {
        // Add new formula
        const { error } = await supabase
          .from('formulas')
          .insert(formulaToSave);
          
        if (error) throw error;
        
        toast({
          title: "Formula added",
          description: "Your formula has been added to the formula sheet."
        });
      }
      
      // Reset form and close modal
      setNewFormula({
        latex: '',
        description: '',
        category: 'General',
        is_block: false
      });
      setEditingFormula(null);
      setIsAddFormulaModalOpen(false);
      
      // Refresh formulas
      fetchFormulas();
    } catch (error) {
      console.error("Error saving formula:", error);
      toast({
        title: "Error",
        description: "Failed to save the formula. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle deleting a formula
  const handleDeleteFormula = async (formulaId: string) => {
    try {
      const { error } = await supabase
        .from('formulas')
        .delete()
        .eq('id', formulaId);
        
      if (error) throw error;
      
      // Update local state
      setFormulas(formulas.filter(f => f.id !== formulaId));
      
      // Update categorized formulas
      const updatedFormulasByCategory = { ...formulasByCategory };
      
      for (const category in updatedFormulasByCategory) {
        updatedFormulasByCategory[category] = updatedFormulasByCategory[category].filter(
          f => f.id !== formulaId
        );
      }
      
      setFormulasByCategory(updatedFormulasByCategory);
      
      toast({
        title: "Formula deleted",
        description: "The formula has been removed from your formula sheet."
      });
    } catch (error) {
      console.error("Error deleting formula:", error);
      toast({
        title: "Error",
        description: "Failed to delete the formula. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  if (activeSection !== 'formulas') {
    return null;
  }
  
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
            onClick={onClose}
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
              {formulas.map((formula) => (
                <Card key={formula.id} className="overflow-hidden">
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
                          onClick={() => formula.id && handleDeleteFormula(formula.id)}
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
                        {formulasByCategory[category]?.map((formula) => (
                          <Card key={formula.id} className="overflow-hidden">
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
                                    onClick={() => formula.id && handleDeleteFormula(formula.id)}
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
            <p className="text-gray-500">No formulas found</p>
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
      
      {/* Add Formula Dialog */}
      <Dialog open={isAddFormulaModalOpen} onOpenChange={(open) => {
        setIsAddFormulaModalOpen(open);
        if (!open) {
          setEditingFormula(null);
          setNewFormula({
            latex: '',
            description: '',
            category: 'General',
            is_block: false
          });
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingFormula ? 'Edit Formula' : 'Add Formula'}</DialogTitle>
            <DialogDescription>
              {editingFormula 
                ? 'Update the details of your formula below.' 
                : 'Add a new formula to your formula sheet.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="latex" className="text-sm font-medium">
                LaTeX Formula
              </label>
              <Input
                id="latex"
                value={newFormula.latex}
                onChange={(e) => setNewFormula({ ...newFormula, latex: e.target.value })}
                placeholder="e.g. E=mc^2"
              />
              <p className="text-xs text-gray-500">
                Enter the formula in LaTeX format without the $ symbols. The system will add them.
              </p>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="preview" className="text-sm font-medium">
                Preview
              </label>
              <div 
                id="preview" 
                className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 min-h-[60px] flex items-center justify-center dark:text-white"
              >
                {newFormula.latex ? (
                  <div dangerouslySetInnerHTML={{
                    __html: renderLatex(newFormula.is_block ? `$$${newFormula.latex}$$` : `$${newFormula.latex}$`)
                  }} />
                ) : (
                  <span className="text-gray-400 italic">Formula preview will appear here</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="displayMode" 
                checked={newFormula.is_block} 
                onCheckedChange={(checked) => 
                  setNewFormula({ ...newFormula, is_block: checked === true })
                }
              />
              <label
                htmlFor="displayMode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Display mode (centered, larger formula)
              </label>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Select
                value={newFormula.category}
                onValueChange={(value) => setNewFormula({ ...newFormula, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  {formulaCategories
                    .filter(cat => cat !== 'General')
                    .map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </label>
              <Textarea
                id="description"
                value={newFormula.description}
                onChange={(e) => setNewFormula({ ...newFormula, description: e.target.value })}
                placeholder="Add an explanation or context for this formula"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={handleAddFormula}>
              {editingFormula ? 'Update Formula' : 'Add Formula'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FormulaStyles />
    </div>
  );
} 