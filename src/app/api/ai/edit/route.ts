import { NextRequest, NextResponse } from "next/server"
import { aiEditorService, SelectionInfo, DocumentContext } from "@/lib/editor/ai-editor-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { selection, action, customPrompt, model, documentContext } = body

    // Validate required fields
    if (!selection || !action) {
      return NextResponse.json(
        { error: "Missing required fields: selection and action" },
        { status: 400 }
      )
    }

    // Validate selection structure
    const selectionInfo: SelectionInfo = {
      text: selection.text,
      from: selection.from,
      to: selection.to,
      isEmpty: selection.isEmpty || false,
      context: selection.context || { before: "", after: "" },
      htmlContext: selection.htmlContext,
    }

    // Validate document context if provided
    const docContext: DocumentContext | undefined = documentContext
      ? {
          sessionId: documentContext.sessionId,
          documentIds: documentContext.documentIds,
          currentDocumentTitle: documentContext.currentDocumentTitle,
        }
      : undefined

    console.log("🔍 AI EDIT DEBUG: Request received")
    console.log("🔍 Selection text:", selection.text)
    console.log("🔍 Action:", action)
    console.log("🔍 HTML Context:", selection.htmlContext)
    console.log("🔍 Document Context:", documentContext)

    // Process the AI edit on the server-side
    const result = await aiEditorService.processSelection(
      selectionInfo,
      action,
      customPrompt,
      model,
      docContext
    )

    console.log("🔍 AI EDIT DEBUG: AI returned result")
    console.log("🔍 Original text:", result.originalText)
    console.log("🔍 AI returned text:", result.text)
    console.log("🔍 Model used:", result.model)
    console.log("🔍 Sources used:", result.sourcesUsed)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("AI edit API error:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process AI edit",
        success: false,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "AI Edit API is running",
    supportedActions: [
      "improve",
      "fix",
      "simplify",
      "expand",
      "shorten",
      "summarize",
      "tone:professional",
      "tone:casual",
      "tone:formal",
      "tone:friendly",
      "tone:confident",
      "tone:diplomatic",
      "translate:spanish",
      "translate:french",
      "translate:german",
      "translate:chinese",
      "custom",
    ],
  })
}
