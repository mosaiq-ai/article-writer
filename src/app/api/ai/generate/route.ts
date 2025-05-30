import { NextRequest, NextResponse } from "next/server"
import { aiEditorService } from "@/lib/editor/ai-editor-service"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, context, style, model } = body

    // Validate required fields
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    // Generate content with AI editor service
    const result = await aiEditorService.generateContent(prompt, context, style, model)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("AI generation error:", error)

    return NextResponse.json(
      {
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "AI Generation API is running",
    description: "Use POST with { prompt, context?, style?, model? } to generate content",
  })
}
