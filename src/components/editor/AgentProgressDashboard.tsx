"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle,
  Circle,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Download,
  FileText,
  Brain,
  Edit3,
  Sparkles,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export interface FlowState {
  id: string
  status: "running" | "completed" | "failed" | "paused"
  progress: number
  currentAgent?: string
  startTime?: string
  endTime?: string
  results: AgentResult[]
}

interface AgentResult {
  agentName: string
  output: Record<string, unknown> | string | null
  metadata: {
    tokensUsed: number
    timeElapsed: number
    model: string
    documentsAccessed: string[]
    toolCalls?: ToolCall[]
  }
  status: "success" | "error" | "partial"
  error?: string
}

interface ToolCall {
  toolName: string
  args?: Record<string, unknown>
}

interface AgentProgressDashboardProps {
  flowId?: string
  flowState?: FlowState
  onComplete?: (document: Record<string, unknown> | string) => void
}

const agentIcons = {
  "Document Intake Agent": FileText,
  "Outline Architect Agent": Brain,
  "Paragraph Writer Agent": Edit3,
  "Content Synthesizer Agent": Sparkles,
}

export function AgentProgressDashboard({
  flowId,
  flowState: externalFlowState,
  onComplete,
}: AgentProgressDashboardProps) {
  const [flowState, setFlowState] = useState<FlowState | null>(externalFlowState || null)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  useEffect(() => {
    // If we have external flow state, use it
    if (externalFlowState) {
      setFlowState(externalFlowState)
      return
    }

    // Otherwise, try to connect to SSE stream if flowId is provided
    if (!flowId) return

    const eventSource = new EventSource(`/api/agents/flow/stream?id=${flowId}`)

    eventSource.onmessage = (event) => {
      const state = JSON.parse(event.data) as FlowState
      setFlowState(state)

      if (state.status === "completed" && state.results.length > 0) {
        const finalResult = state.results[state.results.length - 1]
        const finalDocument =
          typeof finalResult.output === "object" && finalResult.output
            ? (finalResult.output as Record<string, unknown>).finalDocument
            : finalResult.output
        onComplete?.(finalDocument as Record<string, unknown> | string)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [flowId, externalFlowState, onComplete])

  if (!flowState) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              {flowId ? "Connecting to agent flow..." : "No flow data available"}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handlePauseResume = async () => {
    if (!flowId) return

    try {
      await fetch(`/api/agents/flow/${flowId}/${isPaused ? "resume" : "pause"}`, {
        method: "POST",
      })
      setIsPaused(!isPaused)
    } catch (error) {
      console.error("Failed to pause/resume flow:", error)
    }
  }

  const handleRetry = async () => {
    if (!flowId) return

    try {
      await fetch(`/api/agents/flow/${flowId}/retry`, {
        method: "POST",
      })
    } catch (error) {
      console.error("Failed to retry flow:", error)
    }
  }

  const getAgentStatus = (agentName: string) => {
    const result = flowState.results.find((r) => r.agentName === agentName)
    if (!result) return "pending"
    return result.status
  }

  const getAgentResult = (agentName: string) => {
    return flowState.results.find((r) => r.agentName === agentName)
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Generation Progress</CardTitle>
            <div className="flex gap-2">
              {flowId && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePauseResume}
                    disabled={flowState.status !== "running"}
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  {flowState.status === "failed" && (
                    <Button size="sm" variant="outline" onClick={handleRetry}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(flowState.progress)}%</span>
            </div>
            <Progress value={flowState.progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  flowState.status === "completed"
                    ? "default"
                    : flowState.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {flowState.status}
              </Badge>
              {flowState.startTime && (
                <span className="text-muted-foreground">
                  Started {formatDistanceToNow(new Date(flowState.startTime))} ago
                </span>
              )}
            </div>
            {flowState.endTime && (
              <span className="text-muted-foreground">
                Completed in{" "}
                {Math.round(
                  (new Date(flowState.endTime).getTime() -
                    new Date(flowState.startTime!).getTime()) /
                    1000
                )}
                s
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Details */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {Object.entries(agentIcons).map(([agentName, Icon]) => {
                const status = getAgentStatus(agentName)
                const result = getAgentResult(agentName)
                const isActive = flowState.currentAgent === agentName

                return (
                  <button
                    key={agentName}
                    onClick={() => setSelectedAgent(agentName)}
                    className="w-full text-left p-4 rounded-lg border transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {status === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
                        {status === "pending" && !isActive && (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                        {isActive && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{agentName}</span>
                        </div>
                        {result && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {result.metadata.tokensUsed} tokens • {result.metadata.timeElapsed}ms
                            {result.metadata.documentsAccessed && (
                              <span>
                                {" "}
                                • {result.metadata.documentsAccessed.length} docs accessed
                              </span>
                            )}
                          </div>
                        )}
                        {status === "error" && result && (
                          <div className="text-sm text-red-500 mt-1">{result.error}</div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              {selectedAgent ? (
                <div className="space-y-4">
                  <h4 className="font-medium">{selectedAgent}</h4>
                  {(() => {
                    const result = getAgentResult(selectedAgent)
                    if (!result || !result.output) {
                      return <p className="text-sm text-muted-foreground">No output yet</p>
                    }

                    return (
                      <div className="space-y-4">
                        {/* Tool Calls Summary */}
                        {result.metadata.toolCalls && result.metadata.toolCalls.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Tool Calls</h5>
                            <div className="space-y-2">
                              {result.metadata.toolCalls.map((call: ToolCall, index: number) => (
                                <div key={index} className="text-xs bg-muted p-2 rounded">
                                  <span className="font-medium">{call.toolName}</span>
                                  {call.args && (
                                    <div className="mt-1 text-muted-foreground">
                                      {JSON.stringify(call.args, null, 2)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Output Preview */}
                        <div>
                          <h5 className="text-sm font-medium mb-2">Output Preview</h5>
                          <ScrollArea className="h-64 w-full rounded-md border p-4">
                            <div className="text-sm">
                              {typeof result.output === "string"
                                ? result.output.slice(0, 1000) +
                                  (result.output.length > 1000 ? "..." : "")
                                : JSON.stringify(result.output, null, 2).slice(0, 1000)}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select an agent to view details
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      {flowState.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Document Ready</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your document has been generated successfully using the full content of your source
              documents. You can now view the results or download the document.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  const finalResult = flowState.results[flowState.results.length - 1]
                  if (finalResult?.output) {
                    onComplete?.(finalResult.output)
                  }
                }}
              >
                View Document
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
