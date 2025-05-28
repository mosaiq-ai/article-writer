import { NextRequest, NextResponse } from "next/server"
import { documentService } from "@/lib/documents/service"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided",
        },
        { status: 400 }
      )
    }

    // Process the document
    const processedDoc = await documentService.processDocument(file)

    return NextResponse.json({
      success: true,
      document: {
        id: processedDoc.id,
        title: processedDoc.title,
        metadata: processedDoc.metadata,
      },
    })
  } catch (error) {
    console.error("Document upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const documents = await documentService.getAllDocuments()

    return NextResponse.json({
      success: true,
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        metadata: doc.metadata,
      })),
    })
  } catch (error) {
    console.error("Document list error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
