// Proper PDF parser using pdfjs-dist for Node.js environment
// Using legacy build to avoid browser API dependencies

interface PDFTextItem {
  str: string
  dir?: string
  transform?: number[]
  width?: number
  height?: number
}

export async function parsePDF(dataBuffer: Buffer): Promise<{
  numpages: number
  text: string
  info: Record<string, unknown>
}> {
  try {
    // Dynamic import to use legacy build for Node.js
    // @ts-expect-error - Using legacy build which doesn't have types
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js")

    // Convert Buffer to Uint8Array for pdfjs
    const uint8Array = new Uint8Array(dataBuffer)

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      // Disable font face to avoid issues in Node environment
      disableFontFace: true,
      // Use standard fonts only
      standardFontDataUrl: undefined,
      // Disable worker to avoid issues in Node
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    })

    const pdfDocument = await loadingTask.promise
    const numPages = pdfDocument.numPages

    // Extract text from all pages
    let fullText = ""

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Extract text items and join them
      const pageText = textContent.items
        .map((item: PDFTextItem) => {
          // Type guard to ensure we're working with text items
          if (item && typeof item.str === "string") {
            return item.str
          }
          return ""
        })
        .join(" ")

      fullText += pageText + "\n\n"
    }

    // Get document metadata
    const metadata = await pdfDocument.getMetadata()
    const info = (metadata.info || {}) as Record<string, unknown>

    // Clean up the text
    fullText = fullText
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n\s*\n/g, "\n\n") // Normalize line breaks
      .trim()

    return {
      numpages: numPages,
      text: fullText || "No text content found in PDF",
      info: {
        Title: info.Title || "Untitled PDF",
        Author: info.Author || "Unknown",
        Subject: info.Subject || "",
        Keywords: info.Keywords || "",
        Creator: info.Creator || "",
        Producer: info.Producer || "",
        CreationDate: info.CreationDate || new Date().toISOString(),
        ModDate: info.ModDate || new Date().toISOString(),
        ...info,
      },
    }
  } catch (error) {
    console.error("PDF parsing error:", error)
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
