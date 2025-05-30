import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/documents/session-store"

// POST /api/sessions/[sessionId]/documents - Add document to session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { documentId } = await request.json()
    const { sessionId } = await params

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    const success = sessionStore.addDocumentToSession(sessionId, documentId)

    if (!success) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to add document to session:", error)
    return NextResponse.json({ error: "Failed to add document to session" }, { status: 500 })
  }
}

// GET /api/sessions/[sessionId]/documents - Get documents in session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const documentIds = sessionStore.getSessionDocuments(sessionId)

    return NextResponse.json({ documentIds })
  } catch (error) {
    console.error("Failed to get session documents:", error)
    return NextResponse.json({ error: "Failed to get session documents" }, { status: 500 })
  }
}
