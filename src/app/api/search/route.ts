import { NextRequest, NextResponse } from 'next/server'
import { DocumentSearchService } from '@/lib/search/document-search'
import { documentTools } from '@/lib/ai/document-tools'
import { aiService } from '@/lib/ai/service'

export async function POST(request: NextRequest) {
  try {
    const { query, options } = await request.json()
    
    console.log('Search API: Received request:', { query, options })
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }

    // For AI-powered semantic search, use document tools directly
    if (options?.searchType === 'semantic' || options?.searchType === 'hybrid') {
      try {
        const results = await performAISearchWithTools(query, options || {})
        console.log('Search API: AI search with tools results:', results.length, 'documents found')
        return NextResponse.json({ results })
      } catch (aiError) {
        console.warn('Search API: AI search with tools failed, falling back to regular search:', aiError)
        // Fall back to regular search
      }
    }

    // Regular search using DocumentSearchService
    const searchService = new DocumentSearchService()
    const results = await searchService.search(query, options)
    
    console.log('Search API: Regular search results:', results.length, 'documents found')
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function performAISearchWithTools(query: string, options: { limit?: number }) {
  console.log('Using document tools for AI search...')
  
  // Use document tools to get all documents
  const documentsResult = await (documentTools.listDocuments.execute as any)({})
  console.log('Document tools list result:', documentsResult)
  
  if (!documentsResult.documents || documentsResult.documents.length === 0) {
    console.log('No documents found via document tools')
    return []
  }

  // Get full content for each document using document tools
  const fullDocuments = []
  for (const docInfo of documentsResult.documents) {
    const fullDoc = await (documentTools.getDocument.execute as any)({ documentId: docInfo.id })
    if (!fullDoc.error) {
      fullDocuments.push(fullDoc)
      console.log(`Retrieved document via tools: ${fullDoc.title}`)
    } else {
      console.warn(`Failed to retrieve document ${docInfo.id}:`, fullDoc.error)
    }
  }

  if (fullDocuments.length === 0) {
    console.log('No full documents retrieved via document tools')
    return []
  }

  console.log(`Using AI to search ${fullDocuments.length} documents retrieved via tools`)

  // Use AI to perform semantic search
  const searchPrompt = `You are a document search expert. Given the search query "${query}", analyze the provided documents and return a JSON array of relevant documents with their relevance scores.

For each relevant document, provide:
- documentId: the document ID
- score: relevance score from 0.0 to 1.0 (only include documents with score >= 0.3)
- reason: brief explanation of why it's relevant
- relevantSnippet: the most relevant text snippet (max 200 chars)

Return only valid JSON in this format:
[{"documentId": "doc1", "score": 0.85, "reason": "explanation", "relevantSnippet": "text..."}]

Available documents:
${fullDocuments.map(doc => `ID: ${doc.id}, Title: "${doc.title}", Content: ${doc.content.slice(0, 300)}...`).join('\n\n')}`

  const response = await aiService.generateText(searchPrompt, {
    model: selectBestModel(),
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
  const results = []

  for (const item of relevanceResults) {
    const doc = fullDocuments.find(d => d.id === item.documentId)
    if (doc && item.score >= 0.3) {
      results.push({
        id: doc.id,
        documentId: doc.id,
        title: doc.title,
        snippet: item.relevantSnippet || extractSnippet(doc.content, query),
        score: item.score,
        metadata: {
          fileType: doc.metadata?.fileType || 'text',
          wordCount: doc.metadata?.wordCount || 0,
          source: doc.metadata?.source || 'unknown',
          processedAt: doc.metadata?.processedAt || new Date(),
        },
      })
    }
  }

  console.log(`Document tools AI search completed: ${results.length} results`)
  return results.sort((a, b) => b.score - a.score).slice(0, options?.limit || 10)
}

function selectBestModel(): "gpt-4.1" | "claude-4-sonnet" | "gemini-2.5-pro" {
  if (process.env.OPENAI_API_KEY) return 'gpt-4.1'
  if (process.env.ANTHROPIC_API_KEY) return 'claude-4-sonnet'
  if (process.env.GOOGLE_AI_API_KEY) return 'gemini-2.5-pro'
  return 'gpt-4.1'
}

function extractSnippet(content: string, query: string, length: number = 150): string {
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

export async function GET() {
  // Health check endpoint with debugging
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
  const hasGoogle = !!process.env.GOOGLE_AI_API_KEY
  
  console.log('API Key Check:')
  console.log('- OpenAI:', hasOpenAI ? 'Available' : 'Missing')
  console.log('- Anthropic:', hasAnthropic ? 'Available' : 'Missing')
  console.log('- Google:', hasGoogle ? 'Available' : 'Missing')
  
  const hasAI = hasOpenAI || hasAnthropic || hasGoogle
  
  return NextResponse.json({ 
    status: 'ok',
    hasAI,
    debug: {
      hasOpenAI,
      hasAnthropic,
      hasGoogle,
      nodeEnv: process.env.NODE_ENV
    }
  })
} 