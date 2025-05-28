import { NextRequest, NextResponse } from "next/server"
import { aiService } from "@/lib/ai/service"
import { documentTools } from "@/lib/ai/document-tools"

export async function GET() {
  try {
    // Test basic AI functionality
    const result = await aiService.generateText(
      "Hello! Please test the document tools by listing available documents.",
      {
        model: "gpt-4.1",
        temperature: 0.7,
        systemPrompt: "You are a helpful AI assistant with access to document tools.",
        tools: documentTools,
      }
    )

    return NextResponse.json({
      success: true,
      message: "AI integration working!",
      result: {
        text: result.text,
        model: result.model,
        toolCalls: result.toolCalls?.length || 0,
      },
    })
  } catch (error) {
    console.error("AI test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, model } = await request.json()

    // Enhanced prompt that automatically lists and uses documents
    const enhancedPrompt = `${prompt}

Please start by listing all available documents using the listDocuments tool. If documents are available, use the first document's ID to retrieve its content and then provide the requested analysis.`

    const result = await aiService.generateText(enhancedPrompt, {
      model: model || "gpt-4.1",
      tools: documentTools,
      systemPrompt:
        "You are a helpful AI assistant with access to document tools. Always use the tools to access document content when asked to analyze or summarize documents.",
    })

    return NextResponse.json({
      success: true,
      result: {
        text: result.text,
        model: result.model,
        toolCalls: result.toolCalls?.length || 0,
      },
    })
  } catch (error) {
    console.error("AI generation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
