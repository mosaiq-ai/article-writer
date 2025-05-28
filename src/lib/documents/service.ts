import { DocumentProcessor } from "./types"
import { PDFProcessor } from "./processors/pdf-processor"
import { WordProcessor } from "./processors/word-processor"
import { TextProcessor } from "./processors/text-processor"
import { fileTypeFromBuffer } from "file-type"
import { documentStore, type StoredDocument } from "./document-store"
import { aiService } from "../ai/service"
import { ModelId } from "../ai/providers"

export class DocumentService {
  private processors: DocumentProcessor[] = [
    new PDFProcessor(),
    new WordProcessor(),
    new TextProcessor(),
  ]

  async processDocument(file: File): Promise<StoredDocument> {
    const buffer = await file.arrayBuffer()
    const fileType = await this.detectFileType(Buffer.from(buffer))

    const processor = this.processors.find((p) => p.canProcess(fileType))
    if (!processor) {
      throw new Error(`Unsupported file type: ${fileType}`)
    }

    const processed = await processor.process(file, file.name)

    // Create stored document (no chunking needed)
    const storedDoc: StoredDocument = {
      id: processed.id,
      title: processed.title,
      content: processed.content,
      metadata: {
        ...processed.metadata,
        size: processed.content.length,
      },
    }

    // Store in document store
    await documentStore.store(storedDoc)

    // Optionally enhance with AI analysis
    await this.enhanceDocumentMetadata(storedDoc)

    return storedDoc
  }

  private async detectFileType(buffer: Buffer): Promise<string> {
    const type = await fileTypeFromBuffer(buffer)
    return type?.mime || "text/plain"
  }

  private async enhanceDocumentMetadata(document: StoredDocument): Promise<void> {
    try {
      // Use AI to extract additional metadata
      const prompt = `Analyze this document and extract key metadata:

Title: ${document.title}
Content: ${document.content.slice(0, 2000)}...

Extract:
1. Main topics (max 5)
2. Document type/category
3. Key entities mentioned
4. Summary (1-2 sentences)

Return ONLY valid JSON without any markdown formatting or code blocks.`

      const result = await aiService.generateText(prompt, {
        model: "gpt-4.1",
        temperature: 0.3,
        systemPrompt:
          "You are a document analysis expert. Extract structured metadata and return ONLY valid JSON without any markdown formatting, code blocks, or additional text.",
      })

      // Clean the response to handle markdown code blocks if present
      let cleanedText = result.text.trim()

      // Remove markdown code blocks if present
      if (cleanedText.startsWith("```json") || cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
      }

      const metadata = JSON.parse(cleanedText)

      // Update document with enhanced metadata
      const enhanced = {
        ...document,
        metadata: {
          ...document.metadata,
          aiAnalysis: metadata,
        },
      }

      await documentStore.store(enhanced)
    } catch (error) {
      console.error("Failed to enhance document metadata:", error)
      // Continue without enhancement
    }
  }

  async getDocumentsByIds(ids: string[]): Promise<StoredDocument[]> {
    const documents = await Promise.all(ids.map((id: string) => documentStore.retrieve(id)))
    return documents.filter((doc) => doc !== null) as StoredDocument[]
  }

  async getAllDocuments(): Promise<StoredDocument[]> {
    return documentStore.list()
  }

  // Check if documents can fit in model context
  async validateDocumentsForModel(
    documentIds: string[],
    modelId: ModelId
  ): Promise<{
    canFit: boolean
    totalTokens: number
    maxTokens: number
    recommendations?: string[]
  }> {
    const documents = await this.getDocumentsByIds(documentIds)
    const totalContent = documents.map((d) => d.content).join("\n\n")
    const totalTokens = aiService.estimateTokens(totalContent)
    const canFit = aiService.canFitInContext(totalContent, modelId)

    const recommendations: string[] = []
    if (!canFit) {
      recommendations.push("Consider using Gemini 2.5 Pro for ultra-long context")
      recommendations.push("Or split the task into smaller document groups")
    }

    return {
      canFit,
      totalTokens,
      maxTokens: 0, // Will be properly implemented with model access
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    }
  }
}

export const documentService = new DocumentService()
