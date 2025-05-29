"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAgentFlow } from "@/hooks/use-agent-flow"
import { AgentProgressDashboard } from "./AgentProgressDashboard"
import { DocumentCreationWizard } from "./DocumentCreationWizard"
import { Play, FileText } from "lucide-react"

export function StreamingFlowExample() {
  const [showWizard, setShowWizard] = useState(false)
  const [document, setDocument] = useState<string | null>(null)
  const [wizardFlowId, setWizardFlowId] = useState<string | null>(null)

  // Hook for example flow
  const {
    startFlow: startExampleFlow,
    flowState: exampleFlowState,
    isLoading: exampleIsLoading,
    error: exampleError,
  } = useAgentFlow({
    onComplete: (doc) => {
      console.log("✅ Example flow completed:", doc)
      setDocument(typeof doc === "string" ? doc : JSON.stringify(doc, null, 2))
    },
    onError: (err) => {
      console.error("❌ Example flow error:", err)
    },
    onProgress: (progress, currentAgent) => {
      console.log(`📊 Example flow progress: ${progress}% - ${currentAgent}`)
    },
  })

  // Hook for wizard flow monitoring
  const {
    connectToFlow,
    flowState: wizardFlowState,
    isLoading: wizardIsLoading,
    error: wizardError,
    disconnect,
    pauseFlow,
    resumeFlow,
    retryFlow,
  } = useAgentFlow({
    onComplete: (doc) => {
      console.log("✅ Wizard flow completed:", doc)
      setDocument(typeof doc === "string" ? doc : JSON.stringify(doc, null, 2))
      setWizardFlowId(null)
    },
    onError: (err) => {
      console.error("❌ Wizard flow error:", err)
      setWizardFlowId(null)
    },
    onProgress: (progress, currentAgent) => {
      console.log(`📊 Wizard flow progress: ${progress}% - ${currentAgent}`)
    },
  })

  const handleStartExampleFlow = async () => {
    // Clear any existing flows
    setWizardFlowId(null)
    setDocument(null)
    disconnect()

    // Example agent context
    const context = {
      goal: "Create a comprehensive guide on implementing EventSource for real-time updates",
      documentIds: ["example-doc-1", "example-doc-2"], // These would be real document IDs
      style: "technical",
      preferredModel: "claude-4-sonnet",
      constraints: [
        "Target length: medium",
        "Audience: developers",
        "Include code examples and best practices",
      ],
    }

    try {
      await startExampleFlow(context)
    } catch (error) {
      console.error("Failed to start example flow:", error)
    }
  }

  const handleWizardFlowStart = (flowId: string) => {
    console.log("📋 Parent: Wizard flow started with ID:", flowId)
    setWizardFlowId(flowId)
    setDocument(null)

    // Connect to the flow started by the wizard
    console.log("📋 Parent: Connecting to wizard flow:", flowId)
    connectToFlow(flowId)
  }

  const handlePauseResume = async (flowId: string, isPaused: boolean) => {
    try {
      if (isPaused) {
        await resumeFlow(flowId)
      } else {
        await pauseFlow(flowId)
      }
    } catch (error) {
      console.error("Failed to pause/resume flow:", error)
    }
  }

  const handleRetry = async (flowId: string) => {
    try {
      await retryFlow(flowId)
    } catch (error) {
      console.error("Failed to retry flow:", error)
    }
  }

  // Determine which flow is active
  const activeFlowState = wizardFlowState || exampleFlowState
  const isAnyFlowActive = exampleIsLoading || wizardIsLoading || !!wizardFlowId

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Real-time Agent Flow Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This demonstrates the new EventSource integration for real-time agent state updates. You
            can either start an example flow or use the full wizard.
          </p>

          <div className="flex gap-4">
            <Button onClick={handleStartExampleFlow} disabled={isAnyFlowActive}>
              <Play className="mr-2 h-4 w-4" />
              Start Example Flow
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowWizard(true)}
              disabled={isAnyFlowActive}
            >
              <FileText className="mr-2 h-4 w-4" />
              Open Creation Wizard
            </Button>
          </div>

          {(exampleError || wizardError) && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">Error: {exampleError || wizardError}</p>
            </div>
          )}

          {wizardFlowId && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">Monitoring wizard flow: {wizardFlowId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Show progress dashboard when there's an active flow */}
      {activeFlowState && (
        <AgentProgressDashboard
          flowState={activeFlowState}
          onComplete={(doc) => {
            setDocument(typeof doc === "string" ? doc : JSON.stringify(doc, null, 2))
            setWizardFlowId(null)
          }}
          onPauseResume={handlePauseResume}
          onRetry={handleRetry}
        />
      )}

      {/* Show completed document */}
      {document && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap">{document.slice(0, 1000)}...</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Creation Wizard */}
      <DocumentCreationWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onFlowStart={handleWizardFlowStart}
      />
    </div>
  )
}
