export interface AgentContext {
  goal: string
  documentIds: string[]
  style?: string
  constraints?: string[]
  previousResults?: Record<string, unknown>
  maxTokens?: number
  preferredModel?: string
}

export interface AgentResult {
  agentName: string
  output: Record<string, unknown> | null
  metadata: {
    tokensUsed: number
    timeElapsed: number
    model: string
    documentsAccessed: string[]
    toolCalls?: Record<string, unknown>[]
  }
  status: 'success' | 'error' | 'partial'
  error?: string
}

export interface Agent {
  name: string
  description: string
  execute(context: AgentContext): Promise<AgentResult>
}

export interface AgentOrchestrator {
  registerAgent(agent: Agent): void
  executeFlow(context: AgentContext): AsyncGenerator<AgentResult>
} 