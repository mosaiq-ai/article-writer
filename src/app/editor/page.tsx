'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wand2, FileText, Plus } from 'lucide-react'
import { DocumentCreationWizard } from '@/components/editor/DocumentCreationWizard'
import { AgentProgressDashboard, FlowState } from '@/components/editor/AgentProgressDashboard'

export default function EditorPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [currentFlow, setCurrentFlow] = useState<FlowState | null>(null)
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const handleFlowStart = (flowId: string) => {
    // Initialize flow state
    setCurrentFlow({
      id: flowId,
      status: 'running',
      progress: 0,
      results: [],
      startTime: new Date().toISOString(),
    })
    
    // Start monitoring the flow
    monitorFlow(flowId)
  }

  const monitorFlow = async (flowId: string) => {
    // For now, we'll simulate flow monitoring since the current API doesn't return a flow ID
    // In a real implementation, this would connect to a streaming endpoint
    
    console.log('🔄 Monitoring flow:', flowId)
    
    try {
      // Simulate flow progress
      const agents = ['Document Intake Agent', 'Outline Architect Agent', 'Paragraph Writer Agent', 'Content Synthesizer Agent']
      
      for (let i = 0; i < agents.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate processing time
        
        setCurrentFlow(prev => prev ? {
          ...prev,
          progress: ((i + 1) / agents.length) * 100,
          currentAgent: agents[i],
        } : null)
      }
      
      // Mark as completed
      setCurrentFlow(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 100,
        endTime: new Date().toISOString(),
      } : null)
      
    } catch (error) {
      console.error('Flow monitoring error:', error)
      setCurrentFlow(prev => prev ? {
        ...prev,
        status: 'failed',
      } : null)
    }
  }

  const handleFlowComplete = (document: Record<string, unknown> | string) => {
    console.log('📄 Flow completed with document:', document)
    console.log('📄 Document type:', typeof document)
    console.log('📄 Document keys:', document && typeof document === 'object' ? Object.keys(document) : 'N/A')
    
    // Extract the final document content
    let documentContent = ''
    
    if (typeof document === 'string') {
      documentContent = document
      console.log('📄 Using string document, length:', documentContent.length)
    } else if (document && typeof document === 'object') {
      // Try to extract the final document from the agent results
      if ('finalDocument' in document) {
        documentContent = String(document.finalDocument)
        console.log('📄 Using finalDocument, length:', documentContent.length)
      } else if ('document' in document) {
        documentContent = String(document.document)
        console.log('📄 Using document property, length:', documentContent.length)
      } else {
        documentContent = JSON.stringify(document, null, 2)
        console.log('📄 Using JSON stringify, length:', documentContent.length)
      }
    }
    
    console.log('📄 Final document content preview:', documentContent.slice(0, 200))
    
    setGeneratedDocument(documentContent)
    setCurrentFlow(null)
    
    // Automatically show the editor when View Document is clicked
    console.log('📄 Setting showEditor to true')
    setShowEditor(true)
  }

  const handleViewDocument = () => {
    console.log('📄 handleViewDocument called')
    console.log('📄 generatedDocument exists:', !!generatedDocument)
    console.log('📄 generatedDocument length:', generatedDocument?.length || 0)
    if (generatedDocument) {
      console.log('📄 Setting showEditor to true from handleViewDocument')
      setShowEditor(true)
    }
  }

  const handleBackToOverview = () => {
    setShowEditor(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        {/* Debug Panel - Remove this later */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
          <strong>Debug Info:</strong><br/>
          showEditor: {showEditor.toString()}<br/>
          generatedDocument: {generatedDocument ? `${generatedDocument.length} chars` : 'null'}<br/>
          currentFlow: {currentFlow ? `${currentFlow.status} (${currentFlow.progress}%)` : 'null'}
        </div>

        {showEditor ? (
          // Editor View
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Document Editor</h1>
                <p className="text-muted-foreground">Edit your AI-generated document</p>
              </div>
              <Button variant="outline" onClick={handleBackToOverview}>
                Back to Overview
              </Button>
            </div>
            
            {/* Simple Text Editor for now */}
            <Card>
              <CardContent className="p-6">
                <textarea
                  className="w-full h-96 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  value={generatedDocument || ''}
                  onChange={(e) => setGeneratedDocument(e.target.value)}
                  placeholder="Your generated document will appear here..."
                />
              </CardContent>
            </Card>
            
            <div className="flex gap-2">
              <Button onClick={() => {
                // TODO: Implement save functionality
                alert('Document saved! (This is a placeholder - save functionality will be implemented)')
              }}>
                Save Document
              </Button>
              <Button variant="outline" onClick={() => {
                // TODO: Implement download functionality
                const blob = new Blob([generatedDocument || ''], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'generated-document.txt'
                a.click()
                URL.revokeObjectURL(url)
              }}>
                Download as Text
              </Button>
            </div>
          </div>
        ) : (
          // Overview
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold">AI Document Editor</h1>
                <p className="text-muted-foreground">Create intelligent documents with AI assistance</p>
              </div>
              <Button onClick={() => setShowWizard(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Document
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Document Creation */}
              <div className="space-y-6">
                {!currentFlow && !generatedDocument && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5" />
                        Create with AI
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Use our AI agents to create comprehensive documents from your source materials.
                        The system will analyze your documents and generate high-quality content.
                      </p>
                      <Button onClick={() => setShowWizard(true)} className="w-full">
                        <Wand2 className="mr-2 h-4 w-4" />
                        Start Document Creation
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {generatedDocument && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Generated Document
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-auto">
                        <div className="text-sm whitespace-pre-wrap">
                          {generatedDocument.slice(0, 500)}...
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button onClick={handleViewDocument}>
                          Edit Document
                        </Button>
                        <Button onClick={() => setShowWizard(true)}>
                          Create Another
                        </Button>
                        <Button variant="outline" onClick={() => setGeneratedDocument(null)}>
                          Clear
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Agent Progress */}
              <div>
                {currentFlow ? (
                  <AgentProgressDashboard 
                    flowState={currentFlow}
                    onComplete={handleFlowComplete}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Agent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <Wand2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">
                          Start a document creation to see agent progress
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Document Creation Wizard */}
            <DocumentCreationWizard 
              open={showWizard}
              onOpenChange={setShowWizard}
              onFlowStart={handleFlowStart}
            />
          </>
        )}
      </div>
    </div>
  )
} 