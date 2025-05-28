// Wrapper for pdf-parse to prevent test code execution

type PDFParseResult = {
  numpages: number
  text: string
  info: Record<string, unknown>
}

type PDFParseFunction = (dataBuffer: Buffer) => Promise<PDFParseResult>

let pdfParse: PDFParseFunction | undefined

// Only import pdf-parse when actually needed, not at module level
export async function parsePDF(dataBuffer: Buffer): Promise<PDFParseResult> {
  if (!pdfParse) {
    // Dynamic import to avoid module-level execution
    // @ts-expect-error - pdf-parse-fork doesn't have types
    const pdfParseModule = await import("pdf-parse-fork")
    pdfParse = pdfParseModule.default || pdfParseModule
  }

  return pdfParse!(dataBuffer)
}
