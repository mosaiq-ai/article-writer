import { parsePDF } from "../pdf-parser-pdf2json"
import { DocumentProcessor, ProcessedDocument } from "../types"
import { v4 as uuidv4 } from "uuid"

export class PDFProcessor implements DocumentProcessor {
  canProcess(fileType: string): boolean {
    return fileType === "application/pdf" || fileType.endsWith(".pdf")
  }

  async process(file: File | Buffer, filename: string): Promise<ProcessedDocument> {
    let buffer: Buffer

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      buffer = file
    }

    const data = await parsePDF(buffer)

    const documentId = uuidv4()

    // Clean and structure the content
    const cleanContent = this.cleanPdfContent(data.text)

    return {
      id: documentId,
      title: filename.replace(".pdf", ""),
      content: cleanContent,
      metadata: {
        fileType: "pdf",
        pageCount: data.numpages,
        wordCount: cleanContent.split(/\s+/).length,
        processedAt: new Date(),
        source: filename,
        estimatedTokens: Math.ceil(cleanContent.length / 4),
      },
    }
  }

  private cleanPdfContent(text: string): string {
    return (
      text
        // Remove excessive whitespace
        .replace(/\s+/g, " ")
        // Fix common PDF extraction issues
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        // Remove page numbers and headers/footers (basic)
        .replace(/^\d+\s*$/gm, "")
        // Normalize line breaks
        .replace(/\n\s*\n/g, "\n\n")
        .trim()
    )
  }
}
