import { flowManager } from "./stream/route"
import type { AgentContext } from "@/lib/agents/types"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const context: AgentContext = body

    // Validate the context
    if (!context.goal || !context.documentIds || context.documentIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: goal and documentIds" },
        { status: 400 }
      )
    }

    console.log("🚀 Starting agent flow with context:", {
      goal: context.goal,
      documentIds: context.documentIds,
      sessionId: context.sessionId,
      style: context.style,
      preferredModel: context.preferredModel,
    })

    // Generate a flow ID
    const flowId = `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create an initial flow state immediately to avoid race condition with SSE endpoint
    flowManager.createInitialFlowState(context, flowId)

    // Start the flow asynchronously
    setTimeout(async () => {
      try {
        // Consume the flow generator to keep it running
        // Flow states are automatically stored in the flow manager
        for await (const flowState of flowManager.startFlow(context, flowId)) {
          void flowState // Explicitly ignore the value - states are stored in flow manager
        }
      } catch (error) {
        console.error("❌ Agent flow error:", error)
      }
    }, 0)

    // Return the flow ID immediately so the client can connect to the stream
    return NextResponse.json({
      success: true,
      flowId,
      streamUrl: `/api/agents/flow/stream?id=${flowId}`,
    })
  } catch (error) {
    console.error("❌ Agent flow setup error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return flow statistics
  const stats = flowManager.getFlowStats()
  return NextResponse.json({ stats })
}
