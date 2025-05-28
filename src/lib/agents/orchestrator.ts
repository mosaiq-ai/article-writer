import { Agent, AgentContext, AgentResult, AgentOrchestrator } from './types'
import { DocumentIntakeAgent } from './intake-agent'
import { OutlineArchitectAgent } from './outline-agent'
import { ParagraphWriterAgent } from './writer-agent'
import { ContentSynthesizerAgent } from './synthesizer-agent'

export class DocumentCreationOrchestrator implements AgentOrchestrator {
  private agents: Map<string, Agent> = new Map()
  private agentOrder = [
    'intakeAgent',
    'outlineAgent',
    'writerAgent',
    'synthesizerAgent',
  ]

  constructor() {
    // Register all agents
    this.registerAgent(new DocumentIntakeAgent())
    this.registerAgent(new OutlineArchitectAgent())
    this.registerAgent(new ParagraphWriterAgent())
    this.registerAgent(new ContentSynthesizerAgent())
    
    // Debug: Log registered agents
    console.log('🤖 Registered agents:', Array.from(this.agents.keys()))
  }

  registerAgent(agent: Agent): void {
    // Map agent names to expected keys
    const agentKeyMap: Record<string, string> = {
      'Document Intake Agent': 'intakeAgent',
      'Outline Architect Agent': 'outlineAgent', 
      'Paragraph Writer Agent': 'writerAgent',
      'Content Synthesizer Agent': 'synthesizerAgent',
    }
    
    const agentKey = agentKeyMap[agent.name]
    if (agentKey) {
      this.agents.set(agentKey, agent)
    } else {
      console.warn(`Unknown agent: ${agent.name}`)
    }
  }

  async *executeFlow(context: AgentContext): AsyncGenerator<AgentResult> {
    const results: Record<string, unknown> = {}

    for (const agentKey of this.agentOrder) {
      const agent = this.agents.get(agentKey)
      if (!agent) {
        yield {
          agentName: agentKey,
          output: null,
          metadata: { 
            tokensUsed: 0, 
            timeElapsed: 0, 
            model: '', 
            documentsAccessed: [],
            toolCalls: []
          },
          status: 'error',
          error: `Agent ${agentKey} not found`,
        }
        continue
      }

      // Update context with previous results
      const updatedContext = {
        ...context,
        previousResults: results,
      }

      // Execute agent
      const result = await agent.execute(updatedContext)
      results[agentKey] = result.output

      // Yield result for streaming updates
      yield result

      // Stop if agent failed
      if (result.status === 'error') {
        break
      }
    }
  }

  async executeFlowComplete(context: AgentContext): Promise<AgentResult[]> {
    const results: AgentResult[] = []
    
    for await (const result of this.executeFlow(context)) {
      results.push(result)
    }

    return results
  }

  // Get available agents
  getAvailableAgents(): string[] {
    return Array.from(this.agents.keys())
  }

  // Get agent by key
  getAgent(agentKey: string): Agent | undefined {
    return this.agents.get(agentKey)
  }

  // Execute single agent
  async executeSingleAgent(agentKey: string, context: AgentContext): Promise<AgentResult> {
    const agent = this.agents.get(agentKey)
    if (!agent) {
      return {
        agentName: agentKey,
        output: null,
        metadata: { 
          tokensUsed: 0, 
          timeElapsed: 0, 
          model: '', 
          documentsAccessed: [],
          toolCalls: []
        },
        status: 'error',
        error: `Agent ${agentKey} not found`,
      }
    }

    return await agent.execute(context)
  }

  // Debug method to check agent registration
  debugAgents(): void {
    console.log('🔍 Debug: Registered agents:')
    for (const [key, agent] of this.agents.entries()) {
      console.log(`  - ${key}: ${agent.name}`)
    }
    console.log('🔍 Debug: Expected agent order:', this.agentOrder)
  }
} 