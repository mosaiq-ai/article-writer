import { CoreTool } from "ai"
import { documentStore } from "../documents/document-store"
import { z } from "zod"

export const documentTools: Record<string, CoreTool> = {
  listDocuments: {
    description: "List all available documents with their metadata",
    parameters: z.object({}),
    execute: async () => {
      console.log('🔧 Document Tools: listDocuments called')
      const documents = await documentStore.list()
      console.log(`🔧 Document Tools: Found ${documents.length} documents`)
      return {
        documents: documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          fileType: doc.metadata.fileType,
          wordCount: doc.metadata.wordCount,
          source: doc.metadata.source,
        })),
      }
    },
  },

  getDocument: {
    description: "Retrieve the full content of a specific document by ID",
    parameters: z.object({
      documentId: z.string().describe("The ID of the document to retrieve"),
    }),
    execute: async ({ documentId }) => {
      console.log(`🔧 Document Tools: getDocument called for ID: ${documentId}`)
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
    }),
    execute: async ({ query }) => {
      const results = await documentStore.search(query)
      return {
        query,
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
    }),
    execute: async ({ documentIds }) => {
      const documents = await Promise.all(
        documentIds.map((id: string) => documentStore.retrieve(id))
      )

      const validDocuments = documents.filter((doc) => doc !== null)
      const totalTokens = validDocuments.reduce(
        (sum, doc) => sum + Math.ceil(doc!.content.length / 4),
        0
      )

      return {
        documents: validDocuments.map((doc) => ({
          id: doc!.id,
          title: doc!.title,
          content: doc!.content,
          metadata: doc!.metadata,
        })),
        totalDocuments: validDocuments.length,
        estimatedTokens: totalTokens,
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
