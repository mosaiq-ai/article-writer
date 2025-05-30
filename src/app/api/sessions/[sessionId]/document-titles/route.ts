import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/documents/session-store"
import { documentStore } from "@/lib/documents/document-store"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Get the session to get document IDs
    const session = await sessionStore.getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Get document titles for all documents in the session
    const documentTitles: Record<string, string> = {}

    for (const documentId of session.documents) {
      try {
        const document = await documentStore.retrieve(documentId)
        if (document) {
          // Use title if available, otherwise use source name or fallback to ID
          documentTitles[documentId] = document.title || document.metadata.source || documentId
        } else {
          documentTitles[documentId] = documentId // Fallback to ID if document not found
        }
      } catch (error) {
        console.error(`Failed to get document ${documentId}:`, error)
        documentTitles[documentId] = documentId // Fallback to ID on error
      }
    }

    return NextResponse.json(documentTitles)
  } catch (error) {
    console.error("Error fetching document titles:", error)
    return NextResponse.json({ error: "Failed to fetch document titles" }, { status: 500 })
  }
}
