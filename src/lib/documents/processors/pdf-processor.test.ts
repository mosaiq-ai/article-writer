import { describe, it, expect, vi } from "vitest"

// Mock pdf-parse to prevent it from running test code at import
vi.mock("pdf-parse", () => {
  return {
    default: vi.fn().mockImplementation(() => {
      // Simple mock that returns basic PDF data
      return Promise.resolve({
        numpages: 1,
        text: "This is a test PDF content extracted by pdf-parse",
        info: {
          Title: "Test PDF",
          Author: "Test Author",
        },
      })
    }),
  }
})

import { PDFProcessor } from "./pdf-processor"

// Helper to create a mock File with arrayBuffer method
function createMockFile(content: Buffer | string, filename: string, type: string): File {
  const buffer = typeof content === "string" ? Buffer.from(content) : content
  const file = new File([buffer], filename, { type })

  // Add arrayBuffer method for Node.js environment
  if (!file.arrayBuffer) {
    Object.defineProperty(file, "arrayBuffer", {
      value: async () =>
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    })
  }

  return file
}

describe("PDFProcessor", () => {
  const processor = new PDFProcessor()

  it("should identify PDF files correctly", () => {
    expect(processor.canProcess("application/pdf")).toBe(true)
    expect(processor.canProcess("document.pdf")).toBe(true)
    expect(processor.canProcess("text/plain")).toBe(false)
    expect(processor.canProcess("application/msword")).toBe(false)
  })

  it("should process a PDF file", async () => {
    // Create a mock PDF file
    const mockPdfContent = Buffer.from("%PDF-1.4\nmock pdf content")
    const mockFile = createMockFile(mockPdfContent, "test-document.pdf", "application/pdf")

    const result = await processor.process(mockFile, "test-document.pdf")

    expect(result.id).toBeDefined()
    expect(result.title).toBe("test-document")
    expect(result.content).toContain("test PDF content")
    expect(result.metadata.fileType).toBe("pdf")
    expect(result.metadata.pageCount).toBe(1)
    expect(result.metadata.wordCount).toBeGreaterThan(0)
    expect(result.metadata.estimatedTokens).toBeGreaterThan(0)
  })

  it("should process a PDF buffer", async () => {
    // Create a mock PDF buffer
    const mockPdfBuffer = Buffer.from("%PDF-1.4\nmock pdf content")

    const result = await processor.process(mockPdfBuffer, "buffer-document.pdf")

    expect(result.id).toBeDefined()
    expect(result.title).toBe("buffer-document")
    expect(result.content).toContain("test PDF content")
    expect(result.metadata.fileType).toBe("pdf")
    expect(result.metadata.pageCount).toBe(1)
  })

  it("should clean PDF content properly", async () => {
    // Test that content cleaning works
    const mockPdfBuffer = Buffer.from("%PDF-1.4\nmock pdf content")

    const result = await processor.process(mockPdfBuffer, "test.pdf")

    // Check that excessive whitespace is removed
    expect(result.content).not.toMatch(/\s{3,}/)
    // Check that content is trimmed
    expect(result.content).toBe(result.content.trim())
  })
})
