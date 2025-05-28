import { Editor } from '@tiptap/react'

export interface Citation {
  id: string
  documentId: string
  title: string
  author?: string
  date?: Date
  page?: number
  url?: string
  type: 'document' | 'web' | 'book' | 'article'
}

export class CitationManager {
  private citations: Map<string, Citation> = new Map()

  constructor(private editor: Editor) {
    this.scanForCitations()
  }

  addCitation(citation: Citation): string {
    const id = citation.id || this.generateCitationId()
    this.citations.set(id, { ...citation, id })
    this.updateCitationList()
    return id
  }

  getCitation(id: string): Citation | undefined {
    return this.citations.get(id)
  }

  getAllCitations(): Citation[] {
    return Array.from(this.citations.values())
  }

  removeCitation(id: string): void {
    this.citations.delete(id)
    this.updateCitationList()
  }

  insertCitation(citationId: string, format: 'inline' | 'footnote' = 'inline'): void {
    const citation = this.citations.get(citationId)
    if (!citation) return

    if (format === 'inline') {
      const text = `[${citation.author || citation.title}, ${citation.date?.getFullYear() || 'n.d.'}]`
      this.editor.chain().focus().insertContent(text).run()
    } else {
      const footnoteNumber = this.getNextFootnoteNumber()
      this.editor.chain().focus().insertContent(`[^${footnoteNumber}]`).run()
      // Add to footnotes section
      this.addFootnote(footnoteNumber, citation)
    }
  }

  formatBibliography(style: 'apa' | 'mla' | 'chicago' = 'apa'): string {
    const citations = this.getAllCitations()
    return citations
      .sort((a, b) => (a.author || a.title).localeCompare(b.author || b.title))
      .map(citation => this.formatCitation(citation, style))
      .join('\n\n')
  }

  private formatCitation(citation: Citation, style: string): string {
    switch (style) {
      case 'apa':
        return this.formatAPA(citation)
      case 'mla':
        return this.formatMLA(citation)
      case 'chicago':
        return this.formatChicago(citation)
      default:
        return this.formatAPA(citation)
    }
  }

  private formatAPA(citation: Citation): string {
    const author = citation.author || 'Unknown Author'
    const year = citation.date?.getFullYear() || 'n.d.'
    const title = citation.title
    
    if (citation.type === 'web') {
      return `${author}. (${year}). *${title}*. Retrieved from ${citation.url}`
    }
    
    return `${author}. (${year}). *${title}*.`
  }

  private formatMLA(citation: Citation): string {
    const author = citation.author || 'Unknown Author'
    const title = `"${citation.title}"`
    const year = citation.date?.getFullYear() || 'n.d.'
    
    return `${author}. ${title}. ${year}.`
  }

  private formatChicago(citation: Citation): string {
    const author = citation.author || 'Unknown Author'
    const title = `"${citation.title}"`
    const year = citation.date?.getFullYear() || 'n.d.'
    
    return `${author}. ${title}. ${year}.`
  }

  private scanForCitations(): void {
    // Scan document for existing citations
    const content = this.editor.getHTML()
    const citationPattern = /\[ref:([^\]]+)\]/g
    let match

    while ((match = citationPattern.exec(content)) !== null) {
      const [, refId] = match
      // TODO: Parse and add citation if not already tracked
      // This would need to fetch citation details from the referenced document
      // For now, refId is extracted but not used until document lookup is implemented
      console.log('Found citation reference:', refId)
    }
  }

  private generateCitationId(): string {
    return `cite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getNextFootnoteNumber(): number {
    const content = this.editor.getHTML()
    const footnotePattern = /\[\^(\d+)\]/g
    let maxNumber = 0
    let match

    while ((match = footnotePattern.exec(content)) !== null) {
      const number = parseInt(match[1])
      if (number > maxNumber) maxNumber = number
    }

    return maxNumber + 1
  }

  private addFootnote(number: number, citation: Citation): void {
    // This would add the footnote to a footnotes section at the end of the document
    // Implementation depends on document structure
    const footnoteText = `\n\n[^${number}]: ${this.formatCitation(citation, 'apa')}`
    
    // Find or create footnotes section
    const content = this.editor.getHTML()
    if (content.includes('## Footnotes')) {
      // Add to existing footnotes section
      this.editor.chain().focus().insertContent(footnoteText).run()
    } else {
      // Create new footnotes section
      this.editor.chain().focus().insertContent(`\n\n## Footnotes${footnoteText}`).run()
    }
  }

  private updateCitationList(): void {
    // Emit event or update UI with citation list
    // This would typically trigger a re-render of citation UI components
    const event = new CustomEvent('citationsUpdated', {
      detail: { citations: this.getAllCitations() }
    })
    document.dispatchEvent(event)
  }
} 