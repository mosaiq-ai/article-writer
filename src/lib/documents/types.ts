export interface ProcessedDocument {
  id: string
  title: string
  content: string
  metadata: {
    fileType: string
    pageCount?: number
    wordCount: number
    processedAt: Date
    source: string
    estimatedTokens: number
    // PDF-specific metadata
    pdfInfo?: {
      version?: string
      info?: Record<string, unknown>
      metadata?: Record<string, unknown> & {
        extractionMethod?: string
        fileSize?: number
      }
    }
  }
}

export interface DocumentProcessor {
  canProcess(fileType: string): boolean
  process(file: File | Buffer, filename: string): Promise<ProcessedDocument>
}

export interface StoredDocument {
  id: string
  title: string
  content: string
  metadata: {
    fileType: string
    pageCount?: number
    wordCount: number
    processedAt: Date
    source: string
    estimatedTokens: number
    size: number
    // PDF-specific metadata
    pdfInfo?: {
      version?: string
      info?: Record<string, unknown>
      metadata?: Record<string, unknown> & {
        extractionMethod?: string
        fileSize?: number
      }
    }
    aiAnalysis?: {
      topics?: string[]
      category?: string
      entities?: string[]
      summary?: string
    }
  }
}
