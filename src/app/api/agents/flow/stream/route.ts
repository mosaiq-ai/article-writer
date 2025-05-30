import { NextRequest, NextResponse } from "next/server"
import { FlowManager } from "@/lib/agents/flow-manager"

// Create a global flow manager instance
const globalForFlowManager = globalThis as unknown as {
  flowManager: FlowManager | undefined
}

export const flowManager = globalForFlowManager.flowManager ?? new FlowManager()

// Ensure singleton in development
if (process.env.NODE_ENV !== "production") {
  globalForFlowManager.flowManager = flowManager
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const flowId = searchParams.get("id")

  if (!flowId) {
    return NextResponse.json({ error: "Flow ID is required" }, { status: 400 })
  }

  // Check if flow exists
  const flowState = flowManager.getFlowState(flowId)
  if (!flowState) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 })
  }

  // Create a streaming response for Server-Sent Events
  const encoder = new TextEncoder()
  let intervalId: NodeJS.Timeout

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const initialEvent = `data: ${JSON.stringify({
        type: "state",
        flowState: flowState,
      })}\n\n`
      controller.enqueue(encoder.encode(initialEvent))

      // Poll for updates every 500ms
      intervalId = setInterval(() => {
        const currentState = flowManager.getFlowState(flowId)

        if (!currentState) {
          // Flow was deleted
          const deletedEvent = `data: ${JSON.stringify({
            type: "deleted",
            message: "Flow has been deleted",
          })}\n\n`
          controller.enqueue(encoder.encode(deletedEvent))
          clearInterval(intervalId)
          controller.close()
          return
        }

        // Send state update
        const updateEvent = `data: ${JSON.stringify({
          type: "state",
          flowState: currentState,
        })}\n\n`
        controller.enqueue(encoder.encode(updateEvent))

        // If flow is completed or failed, close the stream
        if (currentState.status === "completed" || currentState.status === "failed") {
          const finalDocument =
            currentState.status === "completed" ? flowManager.getFinalDocument(flowId) : null

          const finalEvent = `data: ${JSON.stringify({
            type: "completed",
            status: currentState.status,
            flowState: currentState,
            finalDocument,
          })}\n\n`
          controller.enqueue(encoder.encode(finalEvent))

          clearInterval(intervalId)
          controller.close()
        }
      }, 500)
    },

    cancel() {
      // Clean up on client disconnect
      if (intervalId) {
        clearInterval(intervalId)
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
