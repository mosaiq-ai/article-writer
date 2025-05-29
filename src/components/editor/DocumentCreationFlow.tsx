"use client"

import { useState } from "react"
import { DocumentCreationWizard } from "./DocumentCreationWizard"

interface DocumentCreationFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDocumentReady?: (document: string | Record<string, unknown>) => void
}

interface FlowState {
  id: string
  status: "pending" | "running" | "completed" | "failed" | "paused"
  progress: number
  currentAgent?: string
  results: Array<{
    agentName: string
    output: Record<string, unknown> | string | null
    metadata: {
      tokensUsed: number
      timeElapsed: number
      model: string
      documentsAccessed: string[]
      toolCalls?: Array<{
        toolName: string
        args?: Record<string, unknown>
      }>
    }
    status: "success" | "error" | "partial"
    error?: string
  }>
  context: Record<string, unknown>
  startTime?: Date
  endTime?: Date
  error?: string
}

export function DocumentCreationFlow({
  open,
  onOpenChange,
  onDocumentReady,
}: DocumentCreationFlowProps) {
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)

  const handleFlowStart = (flowId: string) => {
    console.log("🎯 Flow started with ID:", flowId)
    setActiveFlowId(flowId)
    setIsMonitoring(true)

    // Close the wizard immediately
    onOpenChange(false)

    // Start monitoring the flow in the background
    monitorFlow(flowId)
  }

  const monitorFlow = (flowId: string) => {
    console.log("🔍 Starting background monitoring for flow:", flowId)

    const eventSource = new EventSource(`/api/agents/flow/stream?id=${flowId}`)

    eventSource.onmessage = (event) => {
      try {
        const state = JSON.parse(event.data) as FlowState
        console.log(`📊 Flow ${flowId} update:`, {
          status: state.status,
          progress: state.progress,
          currentAgent: state.currentAgent,
        })

        if (state.status === "completed") {
          console.log("✅ Flow completed, extracting document...")

          // Extract the final document from the results
          const finalDocument = extractFinalDocument(state)

          if (finalDocument) {
            console.log("📄 Document extracted successfully")
            onDocumentReady?.(finalDocument)
          } else {
            console.error("❌ Could not extract final document from flow results")
          }

          // Clean up
          eventSource.close()
          setIsMonitoring(false)
          setActiveFlowId(null)
        } else if (state.status === "failed") {
          console.error("❌ Flow failed:", state.error)
          eventSource.close()
          setIsMonitoring(false)
          setActiveFlowId(null)

          // Optionally show error to user
          alert(`Document generation failed: ${state.error || "Unknown error"}`)
        }
      } catch (error) {
        console.error("❌ Error parsing flow state:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("❌ EventSource error:", error)
      eventSource.close()
      setIsMonitoring(false)
      setActiveFlowId(null)
    }

    // Cleanup timeout after 15 minutes
    setTimeout(
      () => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          console.log("⏰ Flow monitoring timeout, closing connection")
          eventSource.close()
          setIsMonitoring(false)
          setActiveFlowId(null)
        }
      },
      15 * 60 * 1000
    )
  }

  const extractFinalDocument = (state: FlowState): string | Record<string, unknown> | null => {
    console.log("🔍 Extracting document from flow results:", state.results.length, "results")

    // Look for the final document in different possible locations
    for (const result of state.results.reverse()) {
      // Start from last result
      if (result.status === "success" && result.output) {
        console.log(`🔍 Checking ${result.agentName} output...`)

        if (typeof result.output === "string") {
          console.log("✅ Found string output from", result.agentName)
          return result.output
        } else if (typeof result.output === "object" && result.output !== null) {
          const output = result.output as Record<string, unknown>

          // Check common property names for the final document
          const possibleKeys = ["finalDocument", "document", "content", "text", "result"]

          for (const key of possibleKeys) {
            if (key in output && typeof output[key] === "string") {
              console.log(`✅ Found document in ${key} property from ${result.agentName}`)
              return output[key] as string
            }
          }

          // If no specific key found, return the whole object
          console.log(`ℹ️ Returning full object from ${result.agentName}`)
          return output
        }
      }
    }

    console.log("❌ No valid document found in any agent results")
    return null
  }

  const handleClose = () => {
    // Reset state when closing
    setActiveFlowId(null)
    setIsMonitoring(false)
    onOpenChange(false)
  }

  return (
    <>
      {/* Show wizard when not monitoring a flow */}
      {!isMonitoring && (
        <DocumentCreationWizard
          open={open}
          onOpenChange={handleClose}
          onFlowStart={handleFlowStart}
        />
      )}

      {/* Show minimal status when monitoring */}
      {isMonitoring && activeFlowId && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium">Generating document...</span>
          </div>
        </div>
      )}
    </>
  )
}
