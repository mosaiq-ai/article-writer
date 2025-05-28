import { StoredDocument } from "./types"

export type { StoredDocument }

export class DocumentStore {
  private documents: Map<string, StoredDocument> = new Map()

  async store(document: StoredDocument): Promise<void> {
    this.documents.set(document.id, document)
  }

  async retrieve(id: string): Promise<StoredDocument | null> {
    return this.documents.get(id) || null
  }

  async list(): Promise<StoredDocument[]> {
    return Array.from(this.documents.values())
  }

  async search(query: string): Promise<StoredDocument[]> {
    const queryLower = query.toLowerCase()
    return Array.from(this.documents.values()).filter(
      (doc) =>
        doc.title.toLowerCase().includes(queryLower) ||
        doc.content.toLowerCase().includes(queryLower) ||
        doc.metadata.source.toLowerCase().includes(queryLower)
    )
  }

  async delete(id: string): Promise<boolean> {
    return this.documents.delete(id)
  }

  async clear(): Promise<void> {
    this.documents.clear()
  }

  async getStats(): Promise<{
    totalDocuments: number
    totalSize: number
    totalTokens: number
  }> {
    const docs = Array.from(this.documents.values())
    return {
      totalDocuments: docs.length,
      totalSize: docs.reduce((sum, doc) => sum + doc.metadata.size, 0),
      totalTokens: docs.reduce((sum, doc) => sum + doc.metadata.estimatedTokens, 0),
    }
  }
}

export const documentStore = new DocumentStore()
