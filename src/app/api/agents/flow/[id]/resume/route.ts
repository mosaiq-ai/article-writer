import { NextRequest, NextResponse } from "next/server"
import { FlowManager } from "@/lib/agents/flow-manager"

const flowManager = FlowManager.getInstance()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const flowId = params.id

    if (!flowId) {
      return NextResponse.json({ error: "Flow ID is required" }, { status: 400 })
    }

    const success = flowManager.resumeFlow(flowId)

    if (!success) {
      return NextResponse.json({ error: "Flow not found or cannot be resumed" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Flow resumed successfully",
      flowState: flowManager.getFlowState(flowId),
    })
  } catch (error) {
    console.error("❌ Flow resume error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
