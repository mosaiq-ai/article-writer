import { NextRequest, NextResponse } from "next/server"
import { FlowManager } from "@/lib/agents/flow-manager"

const flowManager = FlowManager.getInstance()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const flowId = params.id

    if (!flowId) {
      return NextResponse.json({ error: "Flow ID is required" }, { status: 400 })
    }

    const existingFlow = flowManager.getFlowState(flowId)
    if (!existingFlow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 })
    }

    // Create SSE response for streaming the retry
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Retry the flow and stream updates
          for await (const flowState of flowManager.retryFlow(flowId)) {
            // Convert dates to strings for JSON serialization
            const serializedState = {
              ...flowState,
              startTime: flowState.startTime?.toISOString(),
              endTime: flowState.endTime?.toISOString(),
            }

            // Send flow state update
            const data = `data: ${JSON.stringify(serializedState)}\n\n`
            controller.enqueue(encoder.encode(data))

            console.log(
              `🔄 Retrying flow progress: ${Math.round(flowState.progress)}% - ${flowState.currentAgent || "Starting..."}`
            )

            // End stream if flow is complete or failed
            if (flowState.status === "completed" || flowState.status === "failed") {
              console.log("✅ Flow retry completed with status:", flowState.status)
              break
            }
          }
        } catch (error) {
          console.error("❌ Flow retry error:", error)

          // Send error event
          const errorData = `data: ${JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
            status: "failed",
          })}\n\n`
          controller.enqueue(encoder.encode(errorData))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    })
  } catch (error) {
    console.error("❌ Flow retry setup error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
