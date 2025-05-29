import { NextRequest, NextResponse } from "next/server"
import { FlowManager } from "@/lib/agents/flow-manager"
import { AgentContext } from "@/lib/agents/types"

const flowManager = FlowManager.getInstance()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const flowId = searchParams.get("id")

  // If we have a flow ID, stream that specific flow's updates
  if (flowId) {
    const existingFlow = flowManager.getFlowState(flowId)
    if (!existingFlow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 })
    }

    // Create SSE response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Send initial flow state
        const data = `data: ${JSON.stringify(existingFlow)}\n\n`
        controller.enqueue(encoder.encode(data))

        // Close the stream since the flow already exists
        if (existingFlow.status === "completed" || existingFlow.status === "failed") {
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
  }

  return NextResponse.json({ error: "Flow ID is required" }, { status: 400 })
}

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

    console.log("🚀 Starting streaming agent flow with context:", {
      goal: context.goal,
      documentIds: context.documentIds,
      style: context.style,
      preferredModel: context.preferredModel,
    })

    // Create SSE response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Start the flow and stream updates
          for await (const flowState of flowManager.startFlow(context)) {
            console.log("🔍 Streaming: Received flow state from manager:", {
              id: flowState.id,
              progress: flowState.progress,
              currentAgent: flowState.currentAgent,
              resultsLength: flowState.results.length,
              status: flowState.status,
            })

            // Safely serialize the state with proper handling of complex objects
            const serializedState = {
              id: flowState.id,
              status: flowState.status,
              progress: flowState.progress,
              currentAgent: flowState.currentAgent,
              context: flowState.context,
              startTime: flowState.startTime?.toISOString(),
              endTime: flowState.endTime?.toISOString(),
              error: flowState.error,
              // Safely serialize results array
              results: flowState.results.map((result) => ({
                agentName: result.agentName,
                output: result.output,
                metadata: {
                  tokensUsed: result.metadata.tokensUsed,
                  timeElapsed: result.metadata.timeElapsed,
                  model: result.metadata.model,
                  documentsAccessed: result.metadata.documentsAccessed,
                  // Safely serialize toolCalls
                  toolCalls: result.metadata.toolCalls
                    ? JSON.parse(JSON.stringify(result.metadata.toolCalls))
                    : [],
                },
                status: result.status,
                error: result.error,
              })),
            }

            console.log("🔍 Streaming: Serialized state:", {
              id: serializedState.id,
              progress: serializedState.progress,
              currentAgent: serializedState.currentAgent,
              resultsLength: serializedState.results.length,
              status: serializedState.status,
              firstResult: serializedState.results[0]
                ? {
                    agentName: serializedState.results[0].agentName,
                    status: serializedState.results[0].status,
                  }
                : null,
            })

            // Send flow state update
            const data = `data: ${JSON.stringify(serializedState)}\n\n`
            controller.enqueue(encoder.encode(data))

            // Log progress
            console.log(
              `📊 Streaming flow progress: ${Math.round(flowState.progress)}% - ${flowState.currentAgent || "Starting..."}`
            )

            // End stream if flow is complete or failed
            if (flowState.status === "completed" || flowState.status === "failed") {
              console.log("✅ Flow stream completed with status:", flowState.status)
              break
            }
          }
        } catch (error) {
          console.error("❌ Agent flow streaming error:", error)

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
    console.error("❌ Agent flow streaming setup error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
