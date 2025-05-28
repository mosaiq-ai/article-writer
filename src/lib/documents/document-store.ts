import { StoredDocument } from "./types"

export type { StoredDocument }

export class DocumentStore {
  private documents: Map<string, StoredDocument> = new Map()
  private initialized = false

  async store(document: StoredDocument): Promise<void> {
    this.documents.set(document.id, document)
  }

  async retrieve(id: string): Promise<StoredDocument | null> {
    return this.documents.get(id) || null
  }

  async list(): Promise<StoredDocument[]> {
    // Initialize with test documents if empty
    if (!this.initialized) {
      await this.initializeTestDocuments()
    }
    return Array.from(this.documents.values())
  }

  async search(query: string): Promise<StoredDocument[]> {
    // Initialize with test documents if empty
    if (!this.initialized) {
      await this.initializeTestDocuments()
    }
    
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
    this.initialized = false
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

  private async initializeTestDocuments(): Promise<void> {
    if (this.initialized) return
    
    const testDocuments: StoredDocument[] = [
      {
        id: "test-doc-1",
        title: "Introduction to Machine Learning",
        content: "Machine learning is a subset of artificial intelligence that focuses on the development of algorithms and statistical models that enable computer systems to improve their performance on a specific task through experience. The field encompasses various approaches including supervised learning, unsupervised learning, and reinforcement learning. Supervised learning involves training models on labeled data to make predictions on new, unseen data. Common applications include image recognition, natural language processing, and predictive analytics.",
        metadata: {
          fileType: "text",
          wordCount: 78,
          processedAt: new Date(),
          source: "test-document",
          estimatedTokens: 312,
          size: 512,
        }
      },
      {
        id: "test-doc-2", 
        title: "React Development Best Practices",
        content: "React is a popular JavaScript library for building user interfaces, particularly web applications. When developing React applications, it's important to follow best practices to ensure maintainable, performant, and scalable code. Key practices include using functional components with hooks, implementing proper state management, optimizing re-renders with React.memo and useMemo, and following component composition patterns. Testing is also crucial, with tools like Jest and React Testing Library providing excellent support for unit and integration testing.",
        metadata: {
          fileType: "text",
          wordCount: 85,
          processedAt: new Date(),
          source: "test-document",
          estimatedTokens: 340,
          size: 568,
        }
      },
      {
        id: "test-doc-3",
        title: "Database Design Principles",
        content: "Effective database design is fundamental to building robust applications. Key principles include normalization to reduce data redundancy, proper indexing for query performance, and establishing clear relationships between entities. When designing schemas, consider the ACID properties (Atomicity, Consistency, Isolation, Durability) for transactional integrity. Modern applications often benefit from a combination of relational and NoSQL databases, each serving different use cases based on data structure and access patterns.",
        metadata: {
          fileType: "text", 
          wordCount: 72,
          processedAt: new Date(),
          source: "test-document",
          estimatedTokens: 288,
          size: 478,
        }
      }
    ]

    for (const doc of testDocuments) {
      await this.store(doc)
    }
    
    this.initialized = true
    console.log('Initialized document store with', testDocuments.length, 'test documents')
  }
}

export const documentStore = new DocumentStore()
