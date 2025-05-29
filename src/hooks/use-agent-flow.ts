"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AgentContext } from "@/lib/agents/types"

export interface FlowState {
  id: string
  status: "pending" | "running" | "completed" | "failed" | "paused"
  progress: number
  currentAgent?: string
  results: AgentResult[]
  context: AgentContext
  startTime?: string
  endTime?: string
  error?: string
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

interface UseAgentFlowOptions {
  onComplete?: (document: Record<string, unknown> | string) => void
  onError?: (error: string) => void
  onProgress?: (progress: number, currentAgent?: string) => void
}

export function useAgentFlow(options: UseAgentFlowOptions = {}) {
  const [flowState, setFlowState] = useState<FlowState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const { onComplete, onError, onProgress } = options

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  // Handle flow state updates
  const handleFlowUpdate = useCallback(
    (state: FlowState) => {
      console.log("🔍 Hook: handleFlowUpdate called with state:", {
        id: state.id,
        status: state.status,
        progress: state.progress,
        currentAgent: state.currentAgent,
        resultsCount: state.results?.length || 0,
      })

      setFlowState(state)
      setError(null)

      // Call progress callback
      onProgress?.(state.progress, state.currentAgent)

      // Handle completion
      if (state.status === "completed" && state.results.length > 0) {
        const finalResult = state.results[state.results.length - 1]
        const finalDocument =
          typeof finalResult.output === "object" && finalResult.output
            ? (finalResult.output as Record<string, unknown>).finalDocument
            : finalResult.output
        onComplete?.(finalDocument as Record<string, unknown> | string)
        setIsLoading(false)
      }

      // Handle errors
      if (state.status === "failed") {
        const errorMessage = state.error || "Flow failed"
        setError(errorMessage)
        onError?.(errorMessage)
        setIsLoading(false)
      }
    },
    [onComplete, onError, onProgress]
  )

  // Start a new flow with streaming
  const startFlow = useCallback(
    async (context: AgentContext) => {
      try {
        setIsLoading(true)
        setError(null)
        setFlowState(null)

        // Close existing EventSource
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }

        console.log("🔍 Hook: Starting flow with context:", context)

        // Start streaming flow
        const response = await fetch("/api/agents/flow/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(context),
        })

        if (!response.ok) {
          throw new Error(`Failed to start flow: ${response.statusText}`)
        }

        console.log("🔍 Hook: Got response, starting to read stream")

        // Set up EventSource for streaming updates
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response body available")
        }

        let buffer = ""

        // Read the stream
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          console.log("🔍 Hook: Received chunk:", chunk.length, "chars")

          buffer += chunk
          const lines = buffer.split("\n")

          // Keep the last line in buffer if it doesn't end with newline
          buffer = lines.pop() || ""

          for (const line of lines) {
            console.log("🔍 Hook: Processing line:", line.substring(0, 100) + "...")

            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6).trim()
                if (jsonStr) {
                  console.log("🔍 Hook: Parsing JSON:", jsonStr.substring(0, 200) + "...")
                  const data = JSON.parse(jsonStr)

                  if (data.error) {
                    throw new Error(data.error)
                  }

                  console.log("🔍 Hook: Calling handleFlowUpdate with:", {
                    id: data.id,
                    status: data.status,
                    progress: data.progress,
                    currentAgent: data.currentAgent,
                  })

                  handleFlowUpdate(data as FlowState)
                }
              } catch (parseError) {
                console.error("🔍 Hook: Failed to parse SSE data:", parseError, "Line:", line)
              }
            }
          }
        }

        console.log("🔍 Hook: Stream reading completed")
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        console.error("🔍 Hook: startFlow error:", errorMessage)
        setError(errorMessage)
        onError?.(errorMessage)
        setIsLoading(false)
      }
    },
    [handleFlowUpdate, onError]
  )

  // Connect to existing flow
  const connectToFlow = useCallback(
    (flowId: string) => {
      try {
        setIsLoading(true)
        setError(null)

        // Close existing EventSource
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }

        // Create new EventSource
        const eventSource = new EventSource(`/api/agents/flow/stream?id=${flowId}`)
        eventSourceRef.current = eventSource

        eventSource.onmessage = (event) => {
          try {
            const state = JSON.parse(event.data) as FlowState
            handleFlowUpdate(state)
            setIsLoading(false)
          } catch (parseError) {
            console.error("Failed to parse flow state:", parseError)
          }
        }

        eventSource.onerror = () => {
          setError("Connection to flow lost")
          setIsLoading(false)
          eventSource.close()
          eventSourceRef.current = null
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        onError?.(errorMessage)
        setIsLoading(false)
      }
    },
    [handleFlowUpdate, onError]
  )

  // Pause flow
  const pauseFlow = useCallback(
    async (flowId: string) => {
      try {
        const response = await fetch(`/api/agents/flow/${flowId}/pause`, {
          method: "POST",
        })

        if (!response.ok) {
          throw new Error(`Failed to pause flow: ${response.statusText}`)
        }

        const result = await response.json()
        if (result.flowState) {
          handleFlowUpdate(result.flowState)
        }

        return result.success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        onError?.(errorMessage)
        return false
      }
    },
    [handleFlowUpdate, onError]
  )

  // Resume flow
  const resumeFlow = useCallback(
    async (flowId: string) => {
      try {
        const response = await fetch(`/api/agents/flow/${flowId}/resume`, {
          method: "POST",
        })

        if (!response.ok) {
          throw new Error(`Failed to resume flow: ${response.statusText}`)
        }

        const result = await response.json()
        if (result.flowState) {
          handleFlowUpdate(result.flowState)
        }

        return result.success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        onError?.(errorMessage)
        return false
      }
    },
    [handleFlowUpdate, onError]
  )

  // Retry flow with streaming
  const retryFlow = useCallback(
    async (flowId: string) => {
      try {
        setIsLoading(true)
        setError(null)

        // Close existing EventSource
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }

        // Start retry with streaming
        const response = await fetch(`/api/agents/flow/${flowId}/retry`, {
          method: "POST",
        })

        if (!response.ok) {
          throw new Error(`Failed to retry flow: ${response.statusText}`)
        }

        // Read the stream
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response body available")
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.error) {
                  throw new Error(data.error)
                }
                handleFlowUpdate(data as FlowState)
              } catch (parseError) {
                console.error("Failed to parse SSE data:", parseError)
              }
            }
          }
        }

        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        onError?.(errorMessage)
        setIsLoading(false)
        return false
      }
    },
    [handleFlowUpdate, onError]
  )

  // Disconnect from flow
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsLoading(false)
  }, [])

  return {
    flowState,
    isLoading,
    error,
    startFlow,
    connectToFlow,
    pauseFlow,
    resumeFlow,
    retryFlow,
    disconnect,
  }
}
