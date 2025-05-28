import mammoth from "mammoth"
import { DocumentProcessor, ProcessedDocument } from "../types"
import { v4 as uuidv4 } from "uuid"

export class WordProcessor implements DocumentProcessor {
  canProcess(fileType: string): boolean {
    return (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword" ||
      fileType.endsWith(".docx") ||
      fileType.endsWith(".doc")
    )
  }

  async process(file: File | Buffer, filename: string): Promise<ProcessedDocument> {
    const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file

    // Extract with formatting preserved
    const result = await mammoth.convertToHtml({ buffer })
    const textResult = await mammoth.extractRawText({ buffer })

    const documentId = uuidv4()

    // Use HTML version for better structure preservation
    const content = this.cleanWordContent(result.value)

    return {
      id: documentId,
      title: filename.replace(/\.(docx?|doc)$/, ""),
      content,
      metadata: {
        fileType: "word",
        wordCount: textResult.value.split(/\s+/).length,
        processedAt: new Date(),
        source: filename,
        estimatedTokens: Math.ceil(content.length / 4),
      },
    }
  }

  private cleanWordContent(htmlContent: string): string {
    // Convert HTML to structured text while preserving important formatting
    return (
      htmlContent
        // Convert headers
        .replace(/<h([1-6])>/g, "\n# ")
        .replace(/<\/h[1-6]>/g, "\n")
        // Convert paragraphs
        .replace(/<p>/g, "\n")
        .replace(/<\/p>/g, "\n")
        // Convert lists
        .replace(/<li>/g, "• ")
        .replace(/<\/li>/g, "\n")
        // Remove remaining HTML tags
        .replace(/<[^>]*>/g, "")
        // Clean up whitespace
        .replace(/\n\s*\n/g, "\n\n")
        .trim()
    )
  }
}
