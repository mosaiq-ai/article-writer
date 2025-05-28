import { NextResponse } from 'next/server'
import { documentStore } from '@/lib/documents/document-store'

export async function GET() {
  try {
    const documents = await documentStore.list()
    const stats = await documentStore.getStats()
    
    return NextResponse.json({ 
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        metadata: {
          fileType: doc.metadata.fileType,
          wordCount: doc.metadata.wordCount,
          processedAt: doc.metadata.processedAt,
          source: doc.metadata.source,
        }
      })),
      stats 
    })
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 