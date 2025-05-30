export interface DocumentSession {
  id: string
  userId?: string
  documents: string[] // document IDs
  createdAt: Date
  updatedAt: Date
  metadata?: {
    purpose?: string
    source?: string
  }
}

// Global singleton instance - persists across API calls in development
// In production, you'd want to use a database or Redis
const globalForSessions = globalThis as unknown as {
  sessionStore: SessionStore | undefined
}

export class SessionStore {
  private sessions: Map<string, DocumentSession> = new Map()
  private documentToSession: Map<string, string> = new Map()

  generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  createSession(userId?: string, metadata?: DocumentSession["metadata"]): DocumentSession {
    const session: DocumentSession = {
      id: this.generateSessionId(),
      userId,
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    }

    this.sessions.set(session.id, session)
    console.log(
      `📝 SessionStore: Created session ${session.id}. Total sessions: ${this.sessions.size}`
    )
    return session
  }

  getSession(sessionId: string): DocumentSession | null {
    const session = this.sessions.get(sessionId) || null
    console.log(
      `📝 SessionStore: Getting session ${sessionId} - ${session ? "Found" : "Not found"}. Total sessions: ${this.sessions.size}`
    )
    return session
  }

  addDocumentToSession(sessionId: string, documentId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.log(
        `📝 SessionStore: Cannot add document to session ${sessionId} - session not found. Total sessions: ${this.sessions.size}`
      )
      return false
    }

    if (!session.documents.includes(documentId)) {
      session.documents.push(documentId)
      session.updatedAt = new Date()
      this.documentToSession.set(documentId, sessionId)
      console.log(
        `📝 SessionStore: Added document ${documentId} to session ${sessionId}. Session now has ${session.documents.length} documents`
      )
    }

    return true
  }

  getSessionDocuments(sessionId: string): string[] {
    const session = this.sessions.get(sessionId)
    const docs = session?.documents || []
    console.log(
      `📝 SessionStore: Getting documents for session ${sessionId} - found ${docs.length} documents`
    )
    return docs
  }

  getDocumentSession(documentId: string): string | null {
    return this.documentToSession.get(documentId) || null
  }

  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    // Clean up document mappings
    session.documents.forEach((docId) => {
      this.documentToSession.delete(docId)
    })

    return this.sessions.delete(sessionId)
  }

  getActiveSessions(userId?: string): DocumentSession[] {
    const sessions = Array.from(this.sessions.values())

    if (userId) {
      return sessions.filter((s) => s.userId === userId)
    }

    // Return recent sessions (last 24 hours)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return sessions.filter((s) => s.updatedAt > dayAgo)
  }
}

// Create singleton instance
export const sessionStore = globalForSessions.sessionStore ?? new SessionStore()

// Ensure the singleton is stored globally in development
if (process.env.NODE_ENV !== "production") {
  globalForSessions.sessionStore = sessionStore
}
