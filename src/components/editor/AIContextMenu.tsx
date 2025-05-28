'use client'

import { useState, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Sparkles, Edit3, Expand, Minimize,
  RefreshCw, Languages, CheckCircle,
  FileText, Lightbulb, AlertCircle,
} from 'lucide-react'
import { AIEditDialog } from './AIEditDialog'
import { AISelectionHandler } from '@/lib/editor/ai-selection'

interface AIContextMenuProps {
  editor: Editor
  children: React.ReactNode
}

export function AIContextMenu({ editor, children }: AIContextMenuProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [selection, setSelection] = useState<any>(null)

  const aiHandler = new AISelectionHandler(editor)

  useEffect(() => {
    const updateSelection = () => {
      setSelection(aiHandler.getSelection())
    }

    editor.on('selectionUpdate', updateSelection)
    return () => {
      editor.off('selectionUpdate', updateSelection)
    }
  }, [editor, aiHandler])

  const handleAIAction = (action: string) => {
    setSelectedAction(action)
    setShowEditDialog(true)
  }

  const quickActions = [
    { id: 'improve', label: 'Improve Writing', icon: Sparkles },
    { id: 'fix', label: 'Fix Grammar', icon: CheckCircle },
    { id: 'simplify', label: 'Simplify', icon: FileText },
    { id: 'expand', label: 'Make Longer', icon: Expand },
    { id: 'shorten', label: 'Make Shorter', icon: Minimize },
    { id: 'summarize', label: 'Summarize', icon: Lightbulb },
  ]

  const toneActions = [
    { id: 'professional', label: 'Professional' },
    { id: 'casual', label: 'Casual' },
    { id: 'formal', label: 'Formal' },
    { id: 'friendly', label: 'Friendly' },
    { id: 'confident', label: 'Confident' },
    { id: 'diplomatic', label: 'Diplomatic' },
  ]

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {selection && !selection.isEmpty && (
            <>
              <div className="px-2 py-1.5 text-sm font-semibold">
                AI Actions
              </div>
              {quickActions.map((action) => (
                <ContextMenuItem
                  key={action.id}
                  onClick={() => handleAIAction(action.id)}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </ContextMenuItem>
              ))}
              
              <ContextMenuSeparator />
              
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Change Tone
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {toneActions.map((tone) => (
                    <ContextMenuItem
                      key={tone.id}
                      onClick={() => handleAIAction(`tone:${tone.id}`)}
                    >
                      {tone.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>

              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Languages className="mr-2 h-4 w-4" />
                  Translate
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => handleAIAction('translate:spanish')}>
                    Spanish
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAIAction('translate:french')}>
                    French
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAIAction('translate:german')}>
                    German
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAIAction('translate:chinese')}>
                    Chinese
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>

              <ContextMenuSeparator />

              <ContextMenuItem onClick={() => handleAIAction('custom')}>
                <Edit3 className="mr-2 h-4 w-4" />
                Custom Edit...
              </ContextMenuItem>
            </>
          )}

          {/* Standard editor actions */}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => editor.chain().focus().undo().run()}>
            Undo
          </ContextMenuItem>
          <ContextMenuItem onClick={() => editor.chain().focus().redo().run()}>
            Redo
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => document.execCommand('copy')}>
            Copy
          </ContextMenuItem>
          <ContextMenuItem onClick={() => document.execCommand('cut')}>
            Cut
          </ContextMenuItem>
          <ContextMenuItem onClick={() => document.execCommand('paste')}>
            Paste
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AIEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        editor={editor}
        selection={selection}
        action={selectedAction}
      />
    </>
  )
} 