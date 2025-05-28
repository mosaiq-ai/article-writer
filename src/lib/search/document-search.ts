import { documentStore } from '@/lib/documents/document-store'
import { aiService } from '@/lib/ai/service'
import { documentTools } from '@/lib/ai/document-tools'
import { StoredDocument } from '@/lib/documents/types'

export interface SearchResult {
  id: string
  documentId: string
  title: string
  snippet: string
  score: number
  metadata: {
    fileType?: string
    wordCount?: number
    source?: string
    processedAt?: Date
  }
}

export interface SearchOptions {
  limit?: number
  threshold?: number
  documentIds?: string[]
  searchType?: 'semantic' | 'keyword' | 'hybrid'
}

export class DocumentSearchService {
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 10,
      documentIds,
      searchType = 'hybrid',
    } = options

    let results: SearchResult[] = []

    // Get all documents using document tools for consistency
    let documents: StoredDocument[]
    
    if (documentIds && documentIds.length > 0) {
      // Use getMultipleDocuments tool for specific documents
      const toolResult = await (documentTools.getMultipleDocuments.execute as any)({ documentIds })
      documents = toolResult.documents as StoredDocument[]
    } else {
      // Use listDocuments tool to get all documents, then get full content
      const listResult = await (documentTools.listDocuments.execute as any)({})
      
      // Get full content for each document using getDocument tool
      documents = []
      for (const docInfo of listResult.documents) {
        const fullDoc = await (documentTools.getDocument.execute as any)({ documentId: docInfo.id })
        if (!fullDoc.error) {
          documents.push(fullDoc as StoredDocument)
        }
      }
    }

    // Always perform keyword search
    const keywordResults = await this.keywordSearch(query, documents)
    results = [...results, ...keywordResults]

    // Only attempt AI-powered semantic search if we have API keys and it's requested
    if ((searchType === 'semantic' || searchType === 'hybrid') && this.hasAICapability()) {
      try {
        const semanticResults = await this.semanticSearchWithTools(query, documents)
        results = [...results, ...semanticResults]
      } catch (error) {
        console.warn('AI semantic search failed, falling back to keyword search only:', error)
        // Continue with keyword results only
      }
    }

    // Deduplicate and sort by score
    const uniqueResults = this.deduplicateResults(results)
    return uniqueResults.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  private async keywordSearch(
    query: string,
    documents: StoredDocument[]
  ): Promise<SearchResult[]> {
    const queryLower = query.toLowerCase()
    const results: SearchResult[] = []

    for (const doc of documents) {
      if (!doc) continue
      
      const contentLower = doc.content.toLowerCase()
      const titleLower = doc.title.toLowerCase()
      
      // Check for matches in title and content
      const titleMatch = titleLower.includes(queryLower)
      const contentMatch = contentLower.includes(queryLower)
      
      if (titleMatch || contentMatch) {
        const score = this.calculateKeywordScore(doc.content, doc.title, query)
        const snippet = this.extractSnippet(doc.content, query)
        
        results.push({
          id: doc.id,
          documentId: doc.id,
          title: doc.title,
          snippet,
          score: score * 0.8, // Weight keyword matches slightly lower
          metadata: {
            fileType: doc.metadata.fileType,
            wordCount: doc.metadata.wordCount,
            source: doc.metadata.source,
            processedAt: doc.metadata.processedAt,
          },
        })
      }
    }

    return results
  }

  private async semanticSearchWithTools(
    query: string,
    documents: StoredDocument[]
  ): Promise<SearchResult[]> {
    try {
      // Use AI with document tools for semantic search
      const searchPrompt = `You are a document search expert. Given the search query "${query}", analyze the provided documents and return a JSON array of relevant documents with their relevance scores.

For each relevant document, provide:
- documentId: the document ID
- score: relevance score from 0.0 to 1.0 (only include documents with score >= 0.3)
- reason: brief explanation of why it's relevant
- relevantSnippet: the most relevant text snippet (max 200 chars)

Return only valid JSON in this format:
[{"documentId": "doc1", "score": 0.85, "reason": "explanation", "relevantSnippet": "text..."}]

Available documents:
${documents.map(doc => `ID: ${doc.id}, Title: "${doc.title}", Content: ${doc.content.slice(0, 300)}...`).join('\n\n')}`

      // Use the AI service with proper model selection
      const response = await aiService.generateText(searchPrompt, {
        model: this.selectBestModel(),
        temperature: 0.3,
        systemPrompt: 'You are an expert at semantic document analysis. Return only valid JSON without any markdown formatting or code blocks.',
      })

      // Clean the response text to remove any markdown formatting
      let cleanedText = response.text.trim()
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      console.log('AI response (cleaned):', cleanedText)

      const relevanceResults = JSON.parse(cleanedText)
      const results: SearchResult[] = []

      for (const item of relevanceResults) {
        const doc = documents.find(d => d.id === item.documentId)
        if (doc && item.score >= 0.3) {
          results.push({
            id: doc.id,
            documentId: doc.id,
            title: doc.title,
            snippet: item.relevantSnippet || this.extractSnippet(doc.content, query),
            score: item.score,
            metadata: {
              fileType: doc.metadata.fileType,
              wordCount: doc.metadata.wordCount,
              source: doc.metadata.source,
              processedAt: doc.metadata.processedAt,
            },
          })
        }
      }

      return results
    } catch (error) {
      console.error('Semantic search with tools error:', error)
      return []
    }
  }

  private selectBestModel(): "gpt-4.1" | "claude-4-sonnet" | "gemini-2.5-pro" {
    // Select the best available model based on API keys
    if (process.env.OPENAI_API_KEY) return 'gpt-4.1'
    if (process.env.ANTHROPIC_API_KEY) return 'claude-4-sonnet'
    if (process.env.GOOGLE_AI_API_KEY) return 'gemini-2.5-pro'
    return 'gpt-4.1' // fallback
  }

  private async semanticSearch(
    query: string,
    documents: StoredDocument[]
  ): Promise<SearchResult[]> {
    try {
      // Use AI to find semantically relevant documents
      const relevancePrompt = `Given the search query: "${query}"

Rate the relevance of each document on a scale of 0-1 based on semantic similarity and content relevance.

Documents:
${documents.map((doc, i) => `${i}: "${doc.title}" - ${doc.content.slice(0, 200)}...`).join('\n\n')}

Return only a JSON array of objects with format: [{"index": 0, "score": 0.85, "reason": "brief explanation"}, ...]
Only include documents with score >= 0.3.`

      const response = await aiService.generateText(relevancePrompt, {
        model: 'gpt-4.1',
        temperature: 0.3,
        systemPrompt: 'You are an expert at semantic document analysis. Return only valid JSON.',
      })

      const relevanceScores = JSON.parse(response.text)
      const results: SearchResult[] = []

      for (const item of relevanceScores) {
        const doc = documents[item.index]
        if (doc && item.score >= 0.3) {
          const snippet = this.extractSnippet(doc.content, query)
          
          results.push({
            id: doc.id,
            documentId: doc.id,
            title: doc.title,
            snippet,
            score: item.score,
            metadata: {
              fileType: doc.metadata.fileType,
              wordCount: doc.metadata.wordCount,
              source: doc.metadata.source,
              processedAt: doc.metadata.processedAt,
            },
          })
        }
      }

      return results
    } catch (error) {
      console.error('Semantic search error:', error)
      return []
    }
  }

  private extractSnippet(content: string, query: string, length: number = 150): string {
    const queryLower = query.toLowerCase()
    const contentLower = content.toLowerCase()
    const index = contentLower.indexOf(queryLower)

    if (index === -1) {
      return content.slice(0, length) + '...'
    }

    const start = Math.max(0, index - 50)
    const end = Math.min(content.length, index + query.length + 100)
    let snippet = content.slice(start, end)

    if (start > 0) snippet = '...' + snippet
    if (end < content.length) snippet = snippet + '...'

    return snippet
  }

  private calculateKeywordScore(content: string, title: string, query: string): number {
    const queryLower = query.toLowerCase()
    const contentLower = content.toLowerCase()
    const titleLower = title.toLowerCase()
    
    // Count occurrences
    const contentOccurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length
    const titleOccurrences = (titleLower.match(new RegExp(queryLower, 'g')) || []).length
    
    // Calculate scores
    const contentScore = Math.min(1, contentOccurrences / Math.sqrt(content.split(/\s+/).length))
    const titleScore = titleOccurrences > 0 ? 0.5 : 0 // Bonus for title matches
    
    return Math.min(1, contentScore + titleScore)
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>()
    return results.filter(result => {
      const key = `${result.documentId}-${result.snippet.slice(0, 50)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  async searchSimilar(
    documentId: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    const sourceDoc = await documentStore.retrieve(documentId)
    if (!sourceDoc) return []

    // Use AI to find similar documents
    const allDocs = await documentStore.list()
    const otherDocs = allDocs.filter(doc => doc.id !== documentId)

    try {
      const similarityPrompt = `Find documents similar to this source document:

Source: "${sourceDoc.title}"
Content: ${sourceDoc.content.slice(0, 500)}...

Compare with these documents and rate similarity (0-1):
${otherDocs.map((doc, i) => `${i}: "${doc.title}" - ${doc.content.slice(0, 200)}...`).join('\n\n')}

Return JSON array: [{"index": 0, "score": 0.75}, ...] for documents with score >= 0.4`

      const response = await aiService.generateText(similarityPrompt, {
        model: 'gpt-4.1',
        temperature: 0.3,
        systemPrompt: 'You are an expert at document similarity analysis. Return only valid JSON.',
      })

      const similarities = JSON.parse(response.text)
      const results: SearchResult[] = []

      for (const item of similarities.slice(0, limit)) {
        const doc = otherDocs[item.index]
        if (doc && item.score >= 0.4) {
          results.push({
            id: doc.id,
            documentId: doc.id,
            title: doc.title,
            snippet: doc.content.slice(0, 200) + '...',
            score: item.score,
            metadata: doc.metadata,
          })
        }
      }

      return results.sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error('Similar search error:', error)
      return []
    }
  }

  private hasAICapability(): boolean {
    // Check if we have at least one API key available
    return !!(
      process.env.OPENAI_API_KEY || 
      process.env.ANTHROPIC_API_KEY || 
      process.env.GOOGLE_AI_API_KEY
    )
  }
} 