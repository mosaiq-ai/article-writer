import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/documents/session-store"

// GET /api/sessions/[sessionId] - Get a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const session = sessionStore.getSession(sessionId)

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error("Failed to get session:", error)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }
}
