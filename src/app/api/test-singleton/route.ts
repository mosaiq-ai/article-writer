import { NextResponse } from "next/server"
import { sessionStore } from "@/lib/documents/session-store"
import { documentStore } from "@/lib/documents/document-store"

// Test endpoint to verify singleton pattern
export async function GET() {
  const testSessionId = "test-session-" + Date.now()
  const testDocId = "test-doc-" + Date.now()

  // Create a test session
  const session = sessionStore.createSession(undefined, { purpose: "singleton-test" })

  // Get current stats
  const sessionStats = sessionStore.getActiveSessions()
  const docStats = await documentStore.getStats()

  return NextResponse.json({
    testInfo: {
      createdSessionId: session.id,
      testSessionId,
      testDocId,
    },
    sessionStore: {
      totalSessions: sessionStats.length,
      sessions: sessionStats.map((s) => ({
        id: s.id,
        documents: s.documents.length,
        created: s.createdAt,
      })),
    },
    documentStore: {
      stats: docStats,
    },
    singletonCheck: {
      sessionStoreInstance: typeof sessionStore,
      documentStoreInstance: typeof documentStore,
    },
  })
}
