import { CoreTool } from "ai"
import { documentStore } from "../documents/document-store"
import { sessionStore } from "../documents/session-store"
import { z } from "zod"

export const documentTools: Record<string, CoreTool> = {
  listDocuments: {
    description: "List all available documents with their metadata, optionally filtered by session",
    parameters: z.object({
      sessionId: z.string().optional().describe("Optional session ID to filter documents"),
    }),
    execute: async ({ sessionId }) => {
      console.log(
        "🔧 Document Tools: listDocuments called",
        sessionId ? `for session ${sessionId}` : "for all documents"
      )

      if (sessionId) {
        // Get documents for specific session
        const documentIds = sessionStore.getSessionDocuments(sessionId)
        console.log(
          `🔧 Document Tools: Found ${documentIds.length} documents in session ${sessionId}`
        )

        const documents = await Promise.all(documentIds.map((id) => documentStore.retrieve(id)))

        const validDocuments = documents.filter((doc) => doc !== null)

        return {
          sessionId,
          documents: validDocuments.map((doc) => ({
            id: doc!.id,
            title: doc!.title,
            fileType: doc!.metadata.fileType,
            wordCount: doc!.metadata.wordCount,
            source: doc!.metadata.source,
          })),
        }
      } else {
        // Return all documents
        const documents = await documentStore.list()
        console.log(`🔧 Document Tools: Found ${documents.length} total documents`)
        return {
          documents: documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
            fileType: doc.metadata.fileType,
            wordCount: doc.metadata.wordCount,
            source: doc.metadata.source,
          })),
        }
      }
    },
  },

  getDocument: {
    description: "Retrieve the full content of a specific document by ID",
    parameters: z.object({
      documentId: z.string().describe("The ID of the document to retrieve"),
      sessionId: z.string().optional().describe("Optional session ID to verify document access"),
    }),
    execute: async ({ documentId, sessionId }) => {
      console.log(
        `🔧 Document Tools: getDocument called for ID: ${documentId}`,
        sessionId ? `in session ${sessionId}` : ""
      )

      // If sessionId provided, verify document belongs to session
      if (sessionId) {
        const sessionDocIds = sessionStore.getSessionDocuments(sessionId)
        if (!sessionDocIds.includes(documentId)) {
          console.log(`🔧 Document Tools: Document ${documentId} not found in session ${sessionId}`)
          return { error: `Document ${documentId} not found in session ${sessionId}` }
        }
      }

      const document = await documentStore.retrieve(documentId)
      if (!document) {
        console.log(`🔧 Document Tools: Document ${documentId} not found`)
        return { error: `Document with ID ${documentId} not found` }
      }
      console.log(`🔧 Document Tools: Retrieved document: ${document.title}`)
      return {
        id: document.id,
        title: document.title,
        content: document.content,
        metadata: document.metadata,
      }
    },
  },

  searchDocuments: {
    description: "Search for documents containing specific terms or phrases",
    parameters: z.object({
      query: z.string().describe("The search query to find relevant documents"),
      sessionId: z.string().optional().describe("Optional session ID to limit search scope"),
    }),
    execute: async ({ query, sessionId }) => {
      console.log(
        `🔧 Document Tools: searchDocuments called with query: "${query}"`,
        sessionId ? `in session ${sessionId}` : ""
      )

      let searchPool = await documentStore.list()

      // Filter by session if provided
      if (sessionId) {
        const sessionDocIds = sessionStore.getSessionDocuments(sessionId)
        searchPool = searchPool.filter((doc) => sessionDocIds.includes(doc.id))
        console.log(`🔧 Document Tools: Searching within ${searchPool.length} session documents`)
      }

      // Perform search
      const queryLower = query.toLowerCase()
      const results = searchPool.filter(
        (doc) =>
          doc.title.toLowerCase().includes(queryLower) ||
          doc.content.toLowerCase().includes(queryLower) ||
          doc.metadata.source.toLowerCase().includes(queryLower)
      )

      console.log(`🔧 Document Tools: Found ${results.length} matching documents`)

      return {
        query,
        sessionId,
        results: results.map((doc) => ({
          id: doc.id,
          title: doc.title,
          relevantSnippet: extractRelevantSnippet(doc.content, query),
          wordCount: doc.metadata.wordCount,
        })),
      }
    },
  },

  getMultipleDocuments: {
    description: "Retrieve multiple documents by their IDs for comprehensive analysis",
    parameters: z.object({
      documentIds: z.array(z.string()).describe("Array of document IDs to retrieve"),
      sessionId: z.string().optional().describe("Optional session ID to verify document access"),
    }),
    execute: async ({ documentIds, sessionId }) => {
      console.log(
        `🔧 Document Tools: getMultipleDocuments called for ${documentIds.length} documents`,
        sessionId ? `in session ${sessionId}` : ""
      )

      // If sessionId provided, filter to only session documents
      let idsToRetrieve = documentIds
      if (sessionId) {
        const sessionDocIds = sessionStore.getSessionDocuments(sessionId)
        idsToRetrieve = documentIds.filter((id: string) => sessionDocIds.includes(id))

        if (idsToRetrieve.length < documentIds.length) {
          console.log(
            `🔧 Document Tools: Filtered from ${documentIds.length} to ${idsToRetrieve.length} documents based on session`
          )
        }
      }

      const documents = await Promise.all(
        idsToRetrieve.map((id: string) => documentStore.retrieve(id))
      )

      const validDocuments = documents.filter((doc) => doc !== null)
      const totalTokens = validDocuments.reduce(
        (sum, doc) => sum + Math.ceil(doc!.content.length / 4),
        0
      )

      console.log(`🔧 Document Tools: Retrieved ${validDocuments.length} valid documents`)

      return {
        documents: validDocuments.map((doc) => ({
          id: doc!.id,
          title: doc!.title,
          content: doc!.content,
          metadata: doc!.metadata,
        })),
        totalDocuments: validDocuments.length,
        estimatedTokens: totalTokens,
        sessionId,
      }
    },
  },
}

// Helper function to extract relevant snippets
function extractRelevantSnippet(content: string, query: string, maxLength: number = 200): string {
  const queryLower = query.toLowerCase()
  const contentLower = content.toLowerCase()
  const index = contentLower.indexOf(queryLower)

  if (index === -1) {
    return content.slice(0, maxLength) + "..."
  }

  const start = Math.max(0, index - 50)
  const end = Math.min(content.length, index + query.length + 150)

  return (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "")
}
