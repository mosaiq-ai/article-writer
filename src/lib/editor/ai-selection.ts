import { Editor } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'

export interface SelectionInfo {
  text: string
  from: number
  to: number
  isEmpty: boolean
  context: {
    before: string
    after: string
  }
}

export class AISelectionHandler {
  constructor(private editor: Editor) {}

  getSelection(): SelectionInfo | null {
    const { selection } = this.editor.state
    
    if (!(selection instanceof TextSelection) || selection.empty) {
      return null
    }

    const { from, to } = selection
    const text = this.editor.state.doc.textBetween(from, to)
    
    // Get context (100 chars before and after)
    const contextStart = Math.max(0, from - 100)
    const contextEnd = Math.min(this.editor.state.doc.content.size, to + 100)
    
    const before = this.editor.state.doc.textBetween(contextStart, from)
    const after = this.editor.state.doc.textBetween(to, contextEnd)

    return {
      text,
      from,
      to,
      isEmpty: false,
      context: { before, after },
    }
  }

  replaceSelection(newText: string): void {
    const selection = this.getSelection()
    if (!selection) return

    this.editor
      .chain()
      .focus()
      .deleteRange({ from: selection.from, to: selection.to })
      .insertContentAt(selection.from, newText)
      .run()
  }

  highlightSelection(color: string = 'yellow'): void {
    this.editor
      .chain()
      .focus()
      .setHighlight({ color })
      .run()
  }

  wrapSelection(before: string, after: string): void {
    const selection = this.getSelection()
    if (!selection) return

    const wrappedText = `${before}${selection.text}${after}`
    this.replaceSelection(wrappedText)
  }

  getWordAtCursor(): string | null {
    const { selection } = this.editor.state
    const pos = selection.from
    
    // Find word boundaries
    const text = this.editor.state.doc.textContent
    let start = pos
    let end = pos

    // Move start backwards to word boundary
    while (start > 0 && /\w/.test(text[start - 1])) {
      start--
    }

    // Move end forward to word boundary
    while (end < text.length && /\w/.test(text[end])) {
      end++
    }

    if (start === end) return null
    
    return text.slice(start, end)
  }
} 