'use client'

import { Editor } from '@tiptap/react'
import { Loader2, Check, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface EditorStatsProps {
  editor: Editor
  isSaving?: boolean
  lastSaved?: Date | null
}

export function EditorStats({ editor, isSaving = false, lastSaved }: EditorStatsProps) {
  // Safely get character count stats
  const getStats = () => {
    if (!editor) return { characters: 0, words: 0 }
    
    try {
      // Try to get from character count extension
      const characterCount = editor.storage.characterCount
      if (characterCount) {
        return {
          characters: characterCount.characters() || 0,
          words: characterCount.words() || 0
        }
      }
      
      // Fallback: calculate manually
      const text = editor.getText()
      const words = text.trim() ? text.trim().split(/\s+/).length : 0
      const characters = text.length
      
      return { characters, words }
    } catch (error) {
      console.warn('Error getting editor stats:', error)
      return { characters: 0, words: 0 }
    }
  }

  const stats = getStats()

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{stats.words} words</span>
          <span>{stats.characters} characters</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isSaving ? (
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>Saved {formatDistanceToNow(lastSaved)} ago</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Not saved</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 