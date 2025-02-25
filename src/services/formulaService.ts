import { createClient } from '@/utils/supabase/client'
import { extractFormulas, categorizeFormula } from '@/utils/formula-extraction'

/**
 * Definition of a Formula object
 */
interface Formula {
  id: string;
  formula: string;
  latex: string;
  description: string;
  category: string;
  is_block: boolean;
  source_note_id: string;
  notes: {
    title: string;
  } | null;
}

/**
 * Formula update parameters
 */
interface FormulaUpdate {
  formula?: string;
  latex?: string;
  description?: string;
  category?: string;
  is_block?: boolean;
}

/**
 * Service for managing formulas
 */
export const FormulaService = {
  /**
   * Generate description for a formula using OpenAI
   */
  async generateFormulaDescription(formula: string, surroundingText: string = ''): Promise<string> {
    try {
      const response = await fetch('/api/openai/formula-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formula, surroundingText }),
      })

      if (!response.ok) {
        console.error('Error generating formula description:', response.statusText)
        return surroundingText.substring(0, 255) || ''
      }

      const data = await response.json()
      return data.description || surroundingText.substring(0, 255) || ''
    } catch (error) {
      console.error('Error generating formula description:', error)
      return surroundingText.substring(0, 255) || ''
    }
  },

  /**
   * Extract formulas from a note and save them to the database
   */
  async extractAndSaveFormulas(noteId: string): Promise<number> {
    const supabase = createClient()
    
    // Fetch the note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, content, study_session_id')
      .eq('id', noteId)
      .single()
    
    if (noteError || !note) {
      console.error('Error fetching note:', noteError)
      return 0
    }
    
    // Extract formulas from the note content
    const formulas = extractFormulas(note.content)
    
    if (formulas.length === 0) {
      return 0
    }
    
    // First, get existing formulas to avoid duplicates
    const { data: existingFormulas, error: existingError } = await supabase
      .from('formulas')
      .select('formula')
      .eq('study_session_id', note.study_session_id)
    
    if (existingError) {
      console.error('Error fetching existing formulas:', existingError)
      return 0
    }
    
    // Create a Set of existing formulas for quick lookup
    const existingFormulaSet = new Set(existingFormulas?.map(f => f.formula) || [])
    
    // Prepare formulas for database insertion, filtering out duplicates
    const formulasToInsert = []
    
    for (const formula of formulas) {
      if (existingFormulaSet.has(formula.formula)) {
        continue // Skip duplicates
      }
      
      const category = categorizeFormula(formula.formula, formula.surroundingText)
      // Generate AI description for the formula
      const description = await this.generateFormulaDescription(formula.formula, formula.surroundingText)
      
      formulasToInsert.push({
        study_session_id: note.study_session_id,
        formula: formula.formula,
        latex: formula.formula, // Same as formula for now
        description: description,
        category,
        source_note_id: note.id,
        is_block: formula.isBlock
      })
    }
    
    // If there are no new formulas to insert, return 0
    if (formulasToInsert.length === 0) {
      return 0
    }
    
    // Insert formulas into the database
    const { error: insertError } = await supabase
      .from('formulas')
      .insert(formulasToInsert)
    
    if (insertError) {
      console.error('Error inserting formulas:', insertError)
      return 0
    }
    
    return formulasToInsert.length
  },
  
  /**
   * Extract formulas from all notes in a module
   */
  async extractFormulasForModule(moduleId: string): Promise<number> {
    const supabase = createClient()
    
    // Find the study session for this module
    const { data: studySession, error: sessionError } = await supabase
      .from('study_sessions')
      .select('id, user_id')
      .eq('module_title', moduleId)
      .single()
    
    if (sessionError || !studySession) {
      console.error('Error fetching study session:', sessionError)
      return 0
    }

    // Check if user is premium
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', studySession.user_id)
      .single()
    
    if (subError) {
      console.error('Error fetching subscription:', subError)
      return 0
    }
    
    // Only allow premium users (basic or pro tier) to extract formulas
    if (subscription.tier !== 'basic' && subscription.tier !== 'pro') {
      console.error('User does not have premium subscription')
      throw new Error('Premium subscription required')
    }
    
    // Fetch all notes for this study session
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id')
      .eq('study_session_id', studySession.id)
    
    if (notesError || !notes) {
      console.error('Error fetching notes:', notesError)
      return 0
    }
    
    // Extract formulas from each note
    let totalFormulas = 0
    for (const note of notes) {
      const count = await this.extractAndSaveFormulas(note.id)
      totalFormulas += count
    }
    
    return totalFormulas
  },
  
  /**
   * Get all formulas for a module
   */
  async getModuleFormulas(moduleId: string): Promise<Formula[]> {
    const supabase = createClient()
    
    // Find the study session for this module
    const { data: studySession, error: sessionError } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('module_title', moduleId)
      .single()
    
    if (sessionError || !studySession) {
      console.error('Error fetching study session:', sessionError)
      return []
    }
    
    // Fetch all formulas for this study session
    const { data: formulas, error: formulasError } = await supabase
      .from('formulas')
      .select(`
        id,
        formula,
        latex,
        description,
        category,
        is_block,
        source_note_id,
        notes(title)
      `)
      .eq('study_session_id', studySession.id)
      .order('category')
    
    if (formulasError || !formulas) {
      console.error('Error fetching formulas:', formulasError)
      return []
    }
    
    // Type assertion to ensure formulas match the Formula interface
    return formulas as unknown as Formula[]
  },
  
  /**
   * Delete a formula
   */
  async deleteFormula(formulaId: string): Promise<boolean> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('formulas')
      .delete()
      .eq('id', formulaId)
    
    if (error) {
      console.error('Error deleting formula:', error)
      return false
    }
    
    return true
  },
  
  /**
   * Update a formula's details
   */
  async updateFormula(formulaId: string, updates: FormulaUpdate): Promise<boolean> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('formulas')
      .update(updates)
      .eq('id', formulaId)
    
    if (error) {
      console.error('Error updating formula:', error)
      return false
    }
    
    return true
  },

  /**
   * Regenerate descriptions for all formulas in a module using AI
   */
  async regenerateDescriptions(moduleId: string): Promise<number> {
    const supabase = createClient()
    
    // Get all formulas for this module
    const formulas = await this.getModuleFormulas(moduleId)
    
    if (!formulas || formulas.length === 0) {
      return 0
    }
    
    let updatedCount = 0
    
    // Generate new descriptions for each formula
    for (const formula of formulas) {
      try {
        const newDescription = await this.generateFormulaDescription(formula.latex)
        
        // Update the formula with the new description
        const { error } = await supabase
          .from('formulas')
          .update({ description: newDescription })
          .eq('id', formula.id)
        
        if (!error) {
          updatedCount++
        } else {
          console.error('Error updating formula description:', error)
        }
      } catch (error) {
        console.error('Error regenerating formula description:', error)
      }
    }
    
    return updatedCount
  }
} 