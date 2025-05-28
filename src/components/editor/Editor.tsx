'use client'

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react'
import { useEffect, useState } from 'react'
import { defaultEditorConfig } from '@/lib/editor/config'
import { EditorToolbar } from './EditorToolbar'
import { EditorBubbleMenu } from './EditorBubbleMenu'
import { EditorFloatingMenu } from './EditorFloatingMenu'
import { EditorStats } from './EditorStats'
import { AIContextMenu } from './AIContextMenu'
import { AIToolbar } from './AIToolbar'
import { DocumentSearch } from './DocumentSearch'
import { cn } from '@/lib/utils'

interface EditorProps {
  content?: string
  onChange?: (content: string) => void
  onSave?: (content: string) => Promise<void>
  className?: string
  editable?: boolean
}

export function Editor({ 
  content = '', 
  onChange, 
  onSave,
  className,
  editable = true 
}: EditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [showDocumentSearch, setShowDocumentSearch] = useState(false)

  const editor = useEditor({
    ...defaultEditorConfig,
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
    },
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!editor || !onSave) return

    const saveInterval = setInterval(async () => {
      setIsSaving(true)
      try {
        await onSave(editor.getHTML())
        setLastSaved(new Date())
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setIsSaving(false)
      }
    }, 30000)

    return () => clearInterval(saveInterval)
  }, [editor, onSave])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (editor && onSave) {
          setIsSaving(true)
          try {
            await onSave(editor.getHTML())
            setLastSaved(new Date())
          } catch (error) {
            console.error('Manual save failed:', error)
          } finally {
            setIsSaving(false)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor, onSave])

  const handleSearchDocuments = () => {
    console.log('Search documents clicked')
    setShowDocumentSearch(true)
  }

  const handleGenerateContent = () => {
    console.log('Generate content clicked')
    // TODO: Implement content generation
    console.log('Generate content')
  }

  const handleAskAI = () => {
    console.log('Ask AI clicked')
    // TODO: Implement AI assistant
    console.log('Ask AI')
  }

  if (!isMounted || !editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className={cn('editor-container flex flex-col h-full', className)}>
      <div className="flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <EditorToolbar editor={editor} />
        <div className="p-2">
          <AIToolbar 
            editor={editor}
            onSearchDocuments={handleSearchDocuments}
            onGenerateContent={handleGenerateContent}
            onAskAI={handleAskAI}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {isMounted && (
            <>
              <BubbleMenu 
                editor={editor}
                tippyOptions={{ 
                  duration: 100,
                  placement: 'top',
                  appendTo: () => document.body
                }}
              >
                <EditorBubbleMenu editor={editor} />
              </BubbleMenu>

              <FloatingMenu 
                editor={editor}
                tippyOptions={{ 
                  duration: 100,
                  placement: 'top-start',
                  appendTo: () => document.body
                }}
              >
                <EditorFloatingMenu editor={editor} />
              </FloatingMenu>
            </>
          )}

          <AIContextMenu editor={editor}>
            <EditorContent 
              editor={editor} 
              className="prose prose-lg max-w-none focus:outline-none min-h-[400px]"
            />
          </AIContextMenu>
        </div>
      </div>

      <EditorStats 
        editor={editor} 
        isSaving={isSaving}
        lastSaved={lastSaved}
      />

      {/* Document Search Dialog */}
      <DocumentSearch
        open={showDocumentSearch}
        onOpenChange={setShowDocumentSearch}
        editor={editor}
      />
    </div>
  )
} 