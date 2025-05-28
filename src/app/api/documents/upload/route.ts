import { NextRequest, NextResponse } from "next/server"
import { documentService } from "@/lib/documents/service"
import { documentStore } from '@/lib/documents/document-store'
import { v4 as uuidv4 } from 'uuid'

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

    console.log(`📄 Processing uploaded file: ${file.name}`)

    // Process the file based on its type
    const processedDocument = await processFile(file)
    
    // Store in document store
    await documentStore.store(processedDocument)
    
    console.log(`✅ Successfully processed and stored document: ${processedDocument.id}`)

    return NextResponse.json({
      success: true,
      document: {
        id: processedDocument.id,
        title: processedDocument.title,
        fileType: processedDocument.metadata.fileType,
        wordCount: processedDocument.metadata.wordCount,
        size: processedDocument.metadata.size,
      }
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

async function processFile(file: File) {
  const documentId = uuidv4()
  const fileName = file.name
  const fileType = file.type || 'text/plain'
  
  let content: string
  let processedFileType: string

  try {
    // Process based on file type
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      console.log(`🔍 Extracting text from PDF using Python service: ${fileName}`)
      
      try {
        // Use Python PDF processing service
        const pythonServiceUrl = process.env.PYTHON_PDF_SERVICE_URL || 'http://localhost:8000'
        
        // Create form data for Python service
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch(`${pythonServiceUrl}/extract-pdf`, {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          throw new Error(`Python service error: ${response.status} ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (result.success) {
          content = result.text
          console.log(`📝 Extracted ${result.word_count} words from PDF via Python service`)
        } else {
          console.warn(`⚠️ Python service returned minimal content: ${result.error}`)
          content = result.text || `[PDF Content from ${fileName}]\n\nPDF processing completed but resulted in minimal readable text. ${result.error || 'Unknown issue'}`
        }
        
        processedFileType = 'pdf'
        
      } catch (pdfError) {
        console.error(`❌ Python PDF service failed for ${fileName}:`, pdfError)
        // Fallback to placeholder if Python service fails
        content = `[PDF Content from ${fileName}]\n\nPDF text extraction failed. Python service error: ${pdfError instanceof Error ? pdfError.message : 'Unknown PDF processing error'}\n\nTo resolve this issue, ensure the Python PDF service is running on http://localhost:8000`
        processedFileType = 'pdf'
      }
      
    } else if (fileType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      console.log(`🔍 Processing Word document: ${fileName}`)
      
      try {
        // Dynamic import for mammoth
        const mammoth = (await import('mammoth')).default
        
        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Extract text from Word document
        const result = await mammoth.extractRawText({ buffer })
        content = result.value.trim()
        processedFileType = 'word'
        
        console.log(`📝 Extracted ${content.length} characters from Word document`)
        
        if (!content || content.trim().length < 10) {
          content = `[Word Document Content from ${fileName}]\n\nWord document processing completed but resulted in minimal readable text.`
        }
        
      } catch (wordError) {
        console.error(`❌ Word processing failed for ${fileName}:`, wordError)
        content = `[Word Document Content from ${fileName}]\n\nWord document processing failed. Error: ${wordError instanceof Error ? wordError.message : 'Unknown Word processing error'}`
        processedFileType = 'word'
      }
      
    } else {
      // Handle text files
      console.log(`📝 Processing text file: ${fileName}`)
      content = await file.text()
      processedFileType = 'text'
    }
  } catch (error) {
    console.error(`❌ Error processing file ${fileName}:`, error)
    // Fallback to placeholder content if extraction fails
    content = `[Error extracting content from ${fileName}]\n\nFailed to extract text from this file. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    processedFileType = fileType.includes('pdf') ? 'pdf' : fileType.includes('word') ? 'word' : 'text'
  }

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
  const estimatedTokens = Math.ceil(content.length / 4)

  console.log(`✅ Processed ${fileName}: ${wordCount} words, ${estimatedTokens} estimated tokens`)

  return {
    id: documentId,
    title: fileName.replace(/\.(pdf|docx?|txt|md)$/i, ''),
    content,
    metadata: {
      fileType: processedFileType,
      wordCount,
      processedAt: new Date(),
      source: fileName,
      estimatedTokens,
      size: content.length,
    }
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
