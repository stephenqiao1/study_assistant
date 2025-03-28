import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Tag } from 'lucide-react'
import DraftEditor from '@/components/teach/DraftEditor'
import MathPreview from '@/components/formulas/MathPreview'
import { SupabaseClient } from '@supabase/supabase-js'

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface NotesSectionProps {
  selectedNote: Note;
  editMode: boolean;
  tagInput: string;
  editedContent: string;
  setTagInput: (value: string) => void;
  setEditModeWithNotify: (value: boolean) => void;
  setShowDeleteConfirm: (value: boolean) => void;
  handleCancelEdit: () => void;
  handleSaveNote: () => void;
  handleDeleteTag: (tag: string) => void;
  handleAddTag: () => void;
  setEditedContent: (content: string) => void;
  handleImageUpload: (imageData: { url: string; name: string; size: number; type: string }) => void;
  supabase: SupabaseClient;
}

export function NotesSection({
  selectedNote,
  editMode,
  tagInput,
  editedContent,
  setTagInput,
  setEditModeWithNotify,
  setShowDeleteConfirm,
  handleCancelEdit,
  handleSaveNote,
  handleDeleteTag,
  handleAddTag,
  setEditedContent,
  handleImageUpload,
  supabase
}: NotesSectionProps) {
  return (
    <>
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{editMode ? "Edit Note" : selectedNote?.title || "Note"}</h2>
          </div>
          <div className="flex space-x-2">
            {editMode ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                <Button onClick={handleSaveNote}>Save</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEditModeWithNotify(true)}>Edit</Button>
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-2 flex space-x-2">
          {selectedNote.tags && selectedNote.tags.map(tag => (
            <Badge key={tag} className="flex items-center space-x-1">
              <span>{tag}</span>
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTag(tag);
                }}
              />
            </Badge>
          ))}
          <div className="flex space-x-1">
            <Input
              className="h-6 w-24 text-xs"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag();
                }
              }}
              suppressHydrationWarning
            />
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleAddTag}
              suppressHydrationWarning
            >
              <Tag className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex-1">
        {editMode ? (
          <DraftEditor
            initialContent={editedContent}
            onChange={setEditedContent}
            onImageUpload={handleImageUpload}
            supabase={supabase}
          />
        ) : (
          <div className="markdown-preview-wrapper">
            <MathPreview content={selectedNote.content || ''} />
          </div>
        )}
      </div>
    </>
  )
} 