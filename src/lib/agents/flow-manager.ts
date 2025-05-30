import { AgentContext, AgentResult } from "./types"
import { DocumentCreationOrchestrator } from "./orchestrator"
import { v4 as uuidv4 } from "uuid"

export interface FlowState {
  id: string
  status: "pending" | "running" | "completed" | "failed" | "paused"
  progress: number
  currentAgent?: string
  results: AgentResult[]
  context: AgentContext
  startTime?: Date
  endTime?: Date
  error?: string
}

export class FlowManager {
  private flows: Map<string, FlowState> = new Map()
  private orchestrator = new DocumentCreationOrchestrator()

  // Create an initial flow state (for avoiding race conditions)
  createInitialFlowState(context: AgentContext, flowId: string): FlowState {
    const flowState: FlowState = {
      id: flowId,
      status: "running",
      progress: 0,
      results: [],
      context,
      startTime: new Date(),
    }

    this.flows.set(flowId, flowState)
    return flowState
  }

  // Start a new flow
  async *startFlow(context: AgentContext, flowId?: string): AsyncGenerator<FlowState> {
    const id = flowId || uuidv4()

    // Check if flow already exists (might have been pre-created)
    let flowState = this.flows.get(id)

    if (!flowState) {
      flowState = {
        id,
        status: "running",
        progress: 0,
        results: [],
        context,
        startTime: new Date(),
      }
      this.flows.set(id, flowState)
    }

    try {
      let stepCount = 0
      const totalSteps = 4 // Number of agents

      for await (const result of this.orchestrator.executeFlow(context)) {
        stepCount++

        // Update flow state
        flowState.results.push(result)
        flowState.progress = (stepCount / totalSteps) * 100
        flowState.currentAgent = result.agentName

        if (result.status === "error") {
          flowState.status = "failed"
          flowState.error = result.error
          flowState.endTime = new Date()
          this.flows.set(id, flowState)
          yield flowState
          break
        }

        this.flows.set(id, flowState)
        yield flowState
      }

      // Mark as completed if no errors
      if (flowState.status !== "failed") {
        flowState.status = "completed"
        flowState.progress = 100
        flowState.endTime = new Date()
        this.flows.set(id, flowState)
        yield flowState
      }
    } catch (error) {
      flowState.status = "failed"
      flowState.error = error instanceof Error ? error.message : "Unknown error"
      flowState.endTime = new Date()
      this.flows.set(id, flowState)
      yield flowState
    }
  }

  // Get flow state
  getFlowState(flowId: string): FlowState | undefined {
    return this.flows.get(flowId)
  }

  // Get all flows
  getAllFlows(): FlowState[] {
    return Array.from(this.flows.values())
  }

  // Pause a flow
  pauseFlow(flowId: string): boolean {
    const flow = this.flows.get(flowId)
    if (flow && flow.status === "running") {
      flow.status = "paused"
      this.flows.set(flowId, flow)
      return true
    }
    return false
  }

  // Resume a flow
  resumeFlow(flowId: string): boolean {
    const flow = this.flows.get(flowId)
    if (flow && flow.status === "paused") {
      flow.status = "running"
      this.flows.set(flowId, flow)
      return true
    }
    return false
  }

  // Cancel a flow
  cancelFlow(flowId: string): boolean {
    const flow = this.flows.get(flowId)
    if (flow && (flow.status === "running" || flow.status === "paused")) {
      flow.status = "failed"
      flow.error = "Flow cancelled by user"
      flow.endTime = new Date()
      this.flows.set(flowId, flow)
      return true
    }
    return false
  }

  // Retry a failed flow
  async *retryFlow(flowId: string): AsyncGenerator<FlowState> {
    const flow = this.flows.get(flowId)
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`)
    }

    // Reset flow state
    flow.status = "running"
    flow.progress = 0
    flow.results = []
    flow.error = undefined
    flow.startTime = new Date()
    flow.endTime = undefined

    this.flows.set(flowId, flow)

    // Start the flow again with the same ID
    for await (const state of this.startFlow(flow.context, flowId)) {
      yield state
    }
  }

  // Get flow results
  getFlowResults(flowId: string): AgentResult[] {
    const flow = this.flows.get(flowId)
    return flow?.results || []
  }

  // Get final document from completed flow
  getFinalDocument(flowId: string): string | null {
    const flow = this.flows.get(flowId)
    if (!flow || flow.status !== "completed") {
      return null
    }

    // Look for the final document in the synthesizer agent results
    const synthesizerResult = flow.results.find((r) => r.agentName === "Content Synthesizer Agent")
    if (
      synthesizerResult?.output &&
      typeof synthesizerResult.output === "object" &&
      synthesizerResult.output !== null
    ) {
      const output = synthesizerResult.output as Record<string, unknown>
      return (output.finalDocument as string) || null
    }

    // Fallback to writer agent results
    const writerResult = flow.results.find((r) => r.agentName === "Paragraph Writer Agent")
    if (
      writerResult?.output &&
      typeof writerResult.output === "object" &&
      writerResult.output !== null
    ) {
      const output = writerResult.output as Record<string, unknown>
      return (output.document as string) || null
    }

    return null
  }

  // Clean up old flows (optional)
  cleanupOldFlows(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date()
    const flowEntries = Array.from(this.flows.entries())
    for (const [flowId, flow] of flowEntries) {
      if (flow.endTime && now.getTime() - flow.endTime.getTime() > maxAge) {
        this.flows.delete(flowId)
      }
    }
  }

  // Get flow statistics
  getFlowStats(): {
    total: number
    running: number
    completed: number
    failed: number
    paused: number
  } {
    const flows = Array.from(this.flows.values())
    return {
      total: flows.length,
      running: flows.filter((f) => f.status === "running").length,
      completed: flows.filter((f) => f.status === "completed").length,
      failed: flows.filter((f) => f.status === "failed").length,
      paused: flows.filter((f) => f.status === "paused").length,
    }
  }
}
