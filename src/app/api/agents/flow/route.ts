import { FlowManager } from "@/lib/agents/flow-manager"
import type { AgentContext } from "@/lib/agents/types"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const flowManager = new FlowManager()

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

    // Create a streaming response for Server-Sent Events
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial event
          const initialEvent = `data: ${JSON.stringify({
            type: "started",
            progress: 0,
            message: "Starting agent flow...",
          })}\n\n`
          controller.enqueue(encoder.encode(initialEvent))

          // Stream progress updates
          for await (const flowState of flowManager.startFlow(context)) {
            const progressEvent = `data: ${JSON.stringify({
              type: "progress",
              progress: Math.round(flowState.progress),
              currentAgent: flowState.currentAgent,
              status: flowState.status,
              message: `Progress: ${Math.round(flowState.progress)}% - ${flowState.currentAgent || "Processing..."}`,
            })}\n\n`
            controller.enqueue(encoder.encode(progressEvent))

            // If completed or failed, send final event with result
            if (flowState.status === "completed" || flowState.status === "failed") {
              const finalEvent = `data: ${JSON.stringify({
                type: "completed",
                status: flowState.status,
                progress: 100,
                flowState: flowState,
                finalDocument:
                  flowState.status === "completed"
                    ? flowManager.getFinalDocument(flowState.id)
                    : null,
                message:
                  flowState.status === "completed"
                    ? "Document created successfully!"
                    : "Flow failed",
              })}\n\n`
              controller.enqueue(encoder.encode(finalEvent))
              break
            }
          }

          // Close the stream
          controller.close()
        } catch (error) {
          console.error("❌ Agent flow error:", error)
          const errorEvent = `data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
            details: error instanceof Error ? error.stack : undefined,
          })}\n\n`
          controller.enqueue(encoder.encode(errorEvent))
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
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
