'use client'

import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Heading1, List, Quote, Table } from 'lucide-react'

interface EditorFloatingMenuProps {
  editor: Editor
}

export function EditorFloatingMenu({ editor }: EditorFloatingMenuProps) {
  return (
    <div className="flex items-center gap-1 p-2 bg-background border rounded-lg shadow-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <Table className="h-4 w-4" />
      </Button>
    </div>
  )
} 