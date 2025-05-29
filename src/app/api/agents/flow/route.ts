import { NextRequest, NextResponse } from "next/server"
import { FlowManager } from "@/lib/agents/flow-manager"
import { AgentContext } from "@/lib/agents/types"

const flowManager = FlowManager.getInstance()

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
      style: context.style,
      preferredModel: context.preferredModel,
    })

    // Start the flow and collect final state
    let finalState = null

    for await (const flowState of flowManager.startFlow(context)) {
      finalState = flowState

      // Log progress
      console.log(
        `📊 Flow progress: ${Math.round(flowState.progress)}% - ${flowState.currentAgent || "Starting..."}`
      )

      if (flowState.status === "completed" || flowState.status === "failed") {
        break
      }
    }

    if (!finalState) {
      return NextResponse.json({ error: "Flow failed to start" }, { status: 500 })
    }

    console.log("✅ Flow completed with status:", finalState.status)

    return NextResponse.json({
      success: true,
      flowState: finalState,
      finalDocument:
        finalState.status === "completed" ? flowManager.getFinalDocument(finalState.id) : null,
    })
  } catch (error) {
    console.error("❌ Agent flow error:", error)
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
