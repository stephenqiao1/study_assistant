'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from '@/components/ui/use-toast'

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

interface EditModuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedModule: Module) => void
  module: Module | null
}

export default function EditModuleModal({ isOpen, onClose, onSuccess, module }: EditModuleModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  // Load module data when the modal opens
  useEffect(() => {
    if (module && isOpen) {
      setTitle(module.details.title || '')
      setContent(module.details.content || '')
    }
  }, [module, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (!module) {
        throw new Error('No module selected for editing')
      }

      // Get the current user's ID for verification
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No authenticated user')
      }

      // Update the module
      const { error: updateError, data: _updatedData } = await supabase
        .from('study_sessions')
        .update({
          module_title: title.toLowerCase().replace(/\s+/g, '-'), // Update URL-friendly title
          details: {
            ...module.details,
            title,
            content
          }
        })
        .eq('id', module.id)
        .eq('user_id', user.id) // Ensure the user can only edit their own modules
        .select()
        .single()

      if (updateError) throw updateError

      // Create updated module object
      const updatedModule: Module = {
        ...module,
        module_title: title.toLowerCase().replace(/\s+/g, '-'),
        details: {
          ...module.details,
          title,
          content
        }
      }

      // Reset form and close modal
      toast({
        title: "Module updated",
        description: "Your module has been updated successfully."
      })
      onSuccess(updatedModule)
      onClose()
    } catch (error) {
      console.error('Error updating module:', error)
      toast({
        title: "Error updating module",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black opacity-100" />
        <DialogContent className="sm:max-w-[600px] bg-background border border-border">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
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
            <div className="space-y-2">
              <Label htmlFor="content">Module Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter module content (supports Markdown)"
                className="min-h-[300px] font-mono"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !title || !content}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
} 