import { DocumentProcessor, ProcessedDocument } from "../types"
import { v4 as uuidv4 } from "uuid"

export class TextProcessor implements DocumentProcessor {
  canProcess(fileType: string): boolean {
    return (
      fileType === "text/plain" ||
      fileType.endsWith(".txt") ||
      fileType.endsWith(".md") ||
      fileType.endsWith(".markdown")
    )
  }

  async process(file: File | Buffer, filename: string): Promise<ProcessedDocument> {
    let content: string

    if (file instanceof File) {
      content = await file.text()
    } else {
      content = file.toString("utf-8")
    }

    const documentId = uuidv4()

    return {
      id: documentId,
      title: filename.replace(/\.(txt|md|markdown)$/, ""),
      content: content.trim(),
      metadata: {
        fileType: "text",
        wordCount: content.split(/\s+/).length,
        processedAt: new Date(),
        source: filename,
        estimatedTokens: Math.ceil(content.length / 4),
      },
    }
  }
}
