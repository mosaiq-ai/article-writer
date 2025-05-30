import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/documents/session-store"

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, metadata } = body

    const session = sessionStore.createSession(userId, metadata)

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error("Failed to create session:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}

// GET /api/sessions - Get active sessions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    const sessions = sessionStore.getActiveSessions(userId || undefined)

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Failed to get sessions:", error)
    return NextResponse.json({ error: "Failed to get sessions" }, { status: 500 })
  }
}
