'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FlowState } from '@/lib/agents/flow-manager'
import { Loader2, CheckCircle, AlertCircle, Play, Key } from 'lucide-react'

export default function TestAgentsPage() {
  const [currentFlow, setCurrentFlow] = useState<FlowState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({})
  
  // Form state
  const [goal, setGoal] = useState('Create a comprehensive guide on machine learning basics')
  const [documentIds, setDocumentIds] = useState('test-doc-1,test-doc-2,test-doc-3')
  const [style, setStyle] = useState('Professional and informative')
  const [preferredModel, setPreferredModel] = useState('gpt-4.1')

  // Check environment variables on mount
  useEffect(() => {
    const checkEnvVars = async () => {
      try {
        const response = await fetch('/api/env-check')
        const data = await response.json()
        setEnvStatus(data)
      } catch (error) {
        console.error('Failed to check environment variables:', error)
      }
    }
    checkEnvVars()
  }, [])

  const startAgentFlow = async () => {
    if (isRunning) return

    setIsRunning(true)
    setCurrentFlow(null)

    const context = {
      goal,
      documentIds: documentIds.split(',').map(id => id.trim()).filter(Boolean),
      style,
      preferredModel,
      constraints: ['Keep it under 5000 words', 'Include practical examples'],
    }

    try {
      console.log('🚀 Starting agent flow via API...')
      
      const response = await fetch('/api/agents/flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start agent flow')
      }

      if (result.success) {
        console.log('✅ Agent flow completed successfully')
        setCurrentFlow(result.flowState)
      } else {
        throw new Error(result.error || 'Agent flow failed')
      }
    } catch (error) {
      console.error('❌ Flow error:', error)
      setCurrentFlow({
        id: 'error',
        status: 'failed',
        progress: 0,
        results: [],
        context,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />
      case 'error': return <AlertCircle className="h-4 w-4" />
      default: return <Loader2 className="h-4 w-4 animate-spin" />
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agent System Test</h1>
        <Badge variant="outline">Phase 2.3 - Agentic Document Creation</Badge>
      </div>

      {/* Environment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(envStatus).map(([key, isSet]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-md">
                <span className="font-medium">{key}</span>
                <Badge variant={isSet ? 'default' : 'destructive'}>
                  {isSet ? 'Set' : 'Missing'}
                </Badge>
              </div>
            ))}
          </div>
          {Object.values(envStatus).some(v => !v) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ Some API keys are missing. Please check your .env.local file in the project root.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Flow Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="goal">Document Goal</Label>
              <Textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What document do you want to create?"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="documentIds">Document IDs (comma-separated)</Label>
              <Input
                id="documentIds"
                value={documentIds}
                onChange={(e) => setDocumentIds(e.target.value)}
                placeholder="test-doc-1,test-doc-2,test-doc-3"
              />
            </div>

            <div>
              <Label htmlFor="style">Writing Style</Label>
              <Input
                id="style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Professional and informative"
              />
            </div>

            <div>
              <Label htmlFor="model">Preferred Model</Label>
              <select
                id="model"
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="gpt-4.1">GPT-4.1</option>
                <option value="claude-4-sonnet">Claude 4 Sonnet</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
            </div>

            <Button 
              onClick={startAgentFlow} 
              disabled={isRunning || !goal.trim() || Object.values(envStatus).some(v => !v)}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Flow...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Agent Flow
                </>
              )}
            </Button>
            
            {Object.values(envStatus).some(v => !v) && (
              <p className="text-sm text-red-600">
                Cannot start flow: Missing API keys
              </p>
            )}
          </CardContent>
        </Card>

        {/* Progress Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Flow Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {currentFlow ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{Math.round(currentFlow.progress)}%</span>
                  </div>
                  <Progress value={currentFlow.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant={
                    currentFlow.status === 'completed' ? 'default' :
                    currentFlow.status === 'failed' ? 'destructive' :
                    'secondary'
                  }>
                    {currentFlow.status}
                  </Badge>
                  {currentFlow.currentAgent && (
                    <span className="text-sm text-muted-foreground">
                      {currentFlow.currentAgent}
                    </span>
                  )}
                </div>

                {currentFlow.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{currentFlow.error}</p>
                  </div>
                )}

                {/* Agent Results */}
                <div className="space-y-2">
                  <h4 className="font-medium">Agent Results</h4>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {currentFlow.results.map((result, index) => (
                        <div key={index} className="p-3 border rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{result.agentName}</span>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.status)}
                              <Badge variant="outline" className="text-xs">
                                {result.metadata.tokensUsed} tokens
                              </Badge>
                            </div>
                          </div>
                          
                          {result.status === 'error' && result.error && (
                            <p className="text-xs text-red-600">{result.error}</p>
                          )}
                          
                          {result.output && (
                            <div className="text-xs text-muted-foreground">
                              <p>Documents accessed: {result.metadata.documentsAccessed.length}</p>
                              <p>Time: {result.metadata.timeElapsed}ms</p>
                              <p>Model: {result.metadata.model}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No flow running. Configure and start a flow to see progress.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Final Results */}
      {currentFlow?.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>Final Document</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="prose max-w-none">
                {(() => {
                  // Look for final document in synthesizer agent results
                  const synthesizerResult = currentFlow.results.find(r => r.agentName === 'Content Synthesizer Agent')
                  const finalDoc = synthesizerResult?.output?.finalDocument || 
                                   currentFlow.results.find(r => r.agentName === 'Paragraph Writer Agent')?.output?.document
                  
                  return finalDoc ? (
                    <pre className="whitespace-pre-wrap text-sm">{String(finalDoc)}</pre>
                  ) : (
                    <p className="text-muted-foreground">No final document available</p>
                  )
                })()}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Flow Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Flow Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{currentFlow ? 1 : 0}</div>
              <div className="text-sm text-muted-foreground">Current Flow</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {currentFlow?.status === 'completed' ? 1 : 0}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {currentFlow?.status === 'failed' ? 1 : 0}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 