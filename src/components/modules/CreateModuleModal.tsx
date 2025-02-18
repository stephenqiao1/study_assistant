'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CreateModuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateModuleModal({ isOpen, onClose, onSuccess }: CreateModuleModalProps) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No authenticated user')
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          module_title: title.toLowerCase().replace(/\s+/g, '-'), // Create URL-friendly title
          started_at: new Date().toISOString(),
          details: {
            title,
            content: `# ${title}

## Overview

Start with a brief overview of what this module covers.

## Key Concepts

1. First key concept
2. Second key concept
3. Third key concept

## Detailed Explanation

Add your detailed explanation here. You can use:

- Bullet points
- **Bold text** for emphasis
- *Italic text* for definitions
- \`code blocks\` for technical content

## Examples

Include practical examples here.

## Summary

Summarize the main points covered in this module.

---

*Note: You can use Markdown formatting for better organization:*

- Use # for main headings
- Use ## for subheadings
- Use - or * for bullet points
- Use 1. 2. 3. for numbered lists
- Use **text** for bold
- Use *text* for italic
- Use \`code\` for inline code
- Use > for blockquotes`
          }
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Reset form and close modal
      setTitle('')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating module:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Module</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Module Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter module title"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title}>
              {isSubmitting ? 'Creating...' : 'Create Module'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 