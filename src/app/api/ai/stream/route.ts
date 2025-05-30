import { NextRequest, NextResponse } from "next/server"
import { aiEditorService, SelectionInfo } from "@/lib/editor/ai-editor-service"

// Define proper interface for stream result
interface StreamResult {
  textStream: AsyncIterable<string>
  text: Promise<string>
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { selection, action, customPrompt, model } = body

    // Validate required fields
    if (!selection || !action) {
      return NextResponse.json({ error: "Selection and action are required" }, { status: 400 })
    }

    // Validate selection format
    if (!selection.text || typeof selection.from !== "number" || typeof selection.to !== "number") {
      return NextResponse.json({ error: "Invalid selection format" }, { status: 400 })
    }

    const selectionInfo: SelectionInfo = {
      text: selection.text,
      from: selection.from,
      to: selection.to,
      isEmpty: selection.isEmpty || false,
      context: selection.context || { before: "", after: "" },
    }

    // Stream the AI response
    const streamResult = (await aiEditorService.streamProcessSelection(
      selectionInfo,
      action,
      customPrompt,
      model
    )) as StreamResult

    // Create a readable stream for the response
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder()

          // Send initial metadata
          const metadata = {
            type: "metadata",
            action,
            model: model || "claude-4-sonnet",
            originalText: selection.text,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`))

          // Stream the AI response
          for await (const chunk of streamResult.textStream) {
            const data = {
              type: "chunk",
              content: chunk,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          }

          // Send completion signal
          const completion = {
            type: "complete",
            fullText: await streamResult.text,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completion)}\n\n`))
        } catch (error) {
          console.error("Streaming error:", error)
          const errorData = {
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          }
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorData)}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("AI stream error:", error)

    return NextResponse.json(
      {
        error: "Failed to process AI stream request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "AI Stream API is running",
    description: "Use POST to stream AI editing results in real-time",
  })
}
