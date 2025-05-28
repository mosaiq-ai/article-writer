// PDF parser using pdf2json - designed for Node.js
import PDFParser from "pdf2json"

// Type definitions for pdf2json data structures
interface PDFTextRun {
  T: string
}

interface PDFText {
  R: PDFTextRun[]
}

interface PDFPage {
  Texts: PDFText[]
}

interface PDFMeta {
  Title?: string
  Author?: string
  Subject?: string
  Creator?: string
  Producer?: string
  CreationDate?: string
  ModDate?: string
}

interface PDFData {
  Pages: PDFPage[]
  Meta?: PDFMeta
}

interface PDFError {
  parserError: Error
}

export async function parsePDF(dataBuffer: Buffer): Promise<{
  numpages: number
  text: string
  info: Record<string, unknown>
}> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()

    pdfParser.on("pdfParser_dataError", (errData: PDFError) => {
      console.error("PDF parsing error:", errData.parserError)
      reject(new Error(`Failed to parse PDF: ${errData.parserError.message}`))
    })

    pdfParser.on("pdfParser_dataReady", (pdfData: PDFData) => {
      try {
        // Extract text from all pages
        let fullText = ""
        let pageCount = 0

        if (pdfData.Pages) {
          pageCount = pdfData.Pages.length

          pdfData.Pages.forEach((page: PDFPage) => {
            if (page.Texts) {
              page.Texts.forEach((text: PDFText) => {
                if (text.R) {
                  text.R.forEach((r: PDFTextRun) => {
                    if (r.T) {
                      // Decode URI component to get actual text
                      const decodedText = decodeURIComponent(r.T)
                      fullText += decodedText + " "
                    }
                  })
                }
              })
              fullText += "\n\n"
            }
          })
        }

        // Clean up the text
        fullText = fullText
          .replace(/\s+/g, " ") // Normalize whitespace
          .replace(/\n\s*\n/g, "\n\n") // Normalize line breaks
          .trim()

        // Extract metadata
        const metadata: Record<string, unknown> = {}
        if (pdfData.Meta) {
          metadata.Title = pdfData.Meta.Title || "Untitled PDF"
          metadata.Author = pdfData.Meta.Author || "Unknown"
          metadata.Subject = pdfData.Meta.Subject || ""
          metadata.Creator = pdfData.Meta.Creator || ""
          metadata.Producer = pdfData.Meta.Producer || ""
          metadata.CreationDate = pdfData.Meta.CreationDate || new Date().toISOString()
          metadata.ModDate = pdfData.Meta.ModDate || new Date().toISOString()
        }

        resolve({
          numpages: pageCount,
          text: fullText || "No text content found in PDF",
          info: metadata,
        })
      } catch (error) {
        console.error("Error processing PDF data:", error)
        reject(
          new Error(
            `Failed to process PDF data: ${error instanceof Error ? error.message : "Unknown error"}`
          )
        )
      }
    })

    // Parse the PDF buffer
    pdfParser.parseBuffer(dataBuffer)
  })
}
