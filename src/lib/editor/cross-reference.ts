import { Editor } from '@tiptap/react'

export interface CrossReference {
  id: string
  type: 'heading' | 'figure' | 'table' | 'section' | 'footnote'
  label: string
  number?: string
  position: number
}

export class CrossReferenceManager {
  private references: Map<string, CrossReference> = new Map()
  private observer: MutationObserver | null = null

  constructor(private editor: Editor) {
    this.initializeObserver()
    this.scanDocument()
  }

  private initializeObserver(): void {
    this.observer = new MutationObserver(() => {
      this.scanDocument()
    })

    // Observe editor content changes
    const editorElement = this.editor.view.dom
    if (editorElement) {
      this.observer.observe(editorElement, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }
  }

  private scanDocument(): void {
    this.references.clear()
    
    // Scan for headings
    this.scanHeadings()
    
    // Scan for figures
    this.scanFigures()
    
    // Scan for tables
    this.scanTables()
    
    // Update all cross-reference links
    this.updateCrossReferences()
  }

  private scanHeadings(): void {
    const headings = this.editor.view.dom.querySelectorAll('h1, h2, h3, h4, h5, h6')
    headings.forEach((heading, index) => {
      const id = heading.id || `heading-${index}`
      const level = parseInt(heading.tagName[1])
      const text = heading.textContent || ''
      
      this.references.set(id, {
        id,
        type: 'heading',
        label: text,
        number: this.generateHeadingNumber(level, index),
        position: this.getNodePosition(heading),
      })
    })
  }

  private scanFigures(): void {
    const figures = this.editor.view.dom.querySelectorAll('figure')
    figures.forEach((figure, index) => {
      const id = figure.id || `figure-${index + 1}`
      const caption = figure.querySelector('figcaption')?.textContent || ''
      
      this.references.set(id, {
        id,
        type: 'figure',
        label: caption || `Figure ${index + 1}`,
        number: `${index + 1}`,
        position: this.getNodePosition(figure),
      })
    })
  }

  private scanTables(): void {
    const tables = this.editor.view.dom.querySelectorAll('table')
    tables.forEach((table, index) => {
      const id = table.id || `table-${index + 1}`
      const caption = table.querySelector('caption')?.textContent || ''
      
      this.references.set(id, {
        id,
        type: 'table',
        label: caption || `Table ${index + 1}`,
        number: `${index + 1}`,
        position: this.getNodePosition(table),
      })
    })
  }

  insertCrossReference(targetId: string): void {
    const reference = this.references.get(targetId)
    if (!reference) return

    const linkText = `${reference.type === 'heading' ? 'Section' : reference.type} ${reference.number}`
    const link = `<a href="#${targetId}" class="cross-reference" data-ref="${targetId}">${linkText}</a>`
    
    this.editor.chain().focus().insertContent(link).run()
  }

  getCrossReferences(): CrossReference[] {
    return Array.from(this.references.values())
      .sort((a, b) => a.position - b.position)
  }

  private updateCrossReferences(): void {
    const links = this.editor.view.dom.querySelectorAll('a.cross-reference')
    links.forEach(link => {
      const refId = link.getAttribute('data-ref')
      if (refId) {
        const reference = this.references.get(refId)
        if (reference) {
          const linkText = `${reference.type === 'heading' ? 'Section' : reference.type} ${reference.number}`
          if (link.textContent !== linkText) {
            link.textContent = linkText
          }
        }
      }
    })
  }

  private generateHeadingNumber(level: number, index: number): string {
    // Simple numbering scheme - could be made more sophisticated
    return `${index + 1}`
  }

  private getNodePosition(node: Element): number {
    // Get approximate position in document
    const rect = node.getBoundingClientRect()
    return rect.top + window.scrollY
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
} 