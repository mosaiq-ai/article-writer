import { Agent, AgentContext, AgentResult } from './types'
import { aiService } from '../ai/service'
import { documentTools } from '../ai/document-tools'
import { ModelId } from '../ai/providers'

export class OutlineArchitectAgent implements Agent {
  name = 'Outline Architect Agent'
  description = 'Creates strategic document structure with full access to source documents'

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now()
    let tokensUsed = 0
    const documentsAccessed: string[] = []

    try {
      const intakeData = context.previousResults?.intakeAgent as Record<string, unknown> | undefined
      if (!intakeData || !intakeData.fullAnalysisText) {
        throw new Error('No intake data available')
      }

      const prompt = `Based on the document analysis, create a comprehensive outline for: "${context.goal}"

Previous Analysis Summary:
${intakeData.fullAnalysisText}

Now, use the document tools to access the full content of relevant documents and create a detailed outline.

Requirements:
1. Create a logical flow that addresses the goal
2. Access full document content to understand structure and depth
3. Map each section to specific content from source documents
4. Estimate word count for each section
5. Ensure comprehensive coverage without redundancy
6. Include specific quotes or data points where relevant

Style preference: ${context.style || 'Professional and informative'}

Use the available tools to access documents and create a structured outline in JSON format.`

      const result = await aiService.generateText(prompt, {
        model: (context.preferredModel as ModelId) || 'claude-4-sonnet',
        temperature: 0.5,
        systemPrompt: `You are an expert document architect with access to full source documents. 
        
        Create clear, logical outlines that effectively organize complex information. 
        Use the document tools to access complete source material and create detailed, well-structured outlines.
        
        Focus on creating an outline for: "${context.goal}"`,
        tools: documentTools,
      })

      tokensUsed = 8000 // Estimate for outline creation with full document access

      // Track accessed documents
      if (result.toolCalls) {
        (result.toolCalls as Record<string, unknown>[]).forEach(call => {
          if (call.toolName === 'getDocument' && call.args && typeof call.args === 'object' && call.args !== null && 'documentId' in call.args) {
            documentsAccessed.push(call.args.documentId as string)
          }
          if (call.toolName === 'getMultipleDocuments' && call.args && typeof call.args === 'object' && call.args !== null && 'documentIds' in call.args) {
            const ids = call.args.documentIds as string[]
            documentsAccessed.push(...ids)
          }
        })
      }

      const outline = this.parseOutlineFromResponse(result.text)

      return {
        agentName: this.name,
        output: {
          outline,
          outlineText: result.text,
          documentsReferenced: documentsAccessed,
          toolCallsUsed: result.toolCalls?.length || 0,
        },
        metadata: {
          tokensUsed,
          timeElapsed: Date.now() - startTime,
          model: result.model,
          documentsAccessed,
          toolCalls: result.toolCalls as Record<string, unknown>[] || [],
        },
        status: 'success',
      }
    } catch (error) {
      return {
        agentName: this.name,
        output: null,
        metadata: {
          tokensUsed,
          timeElapsed: Date.now() - startTime,
          model: context.preferredModel || 'claude-4-sonnet',
          documentsAccessed,
          toolCalls: [],
        },
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private parseOutlineFromResponse(response: string): Record<string, unknown> {
    // Extract outline structure from AI response
    // Could be enhanced with JSON parsing if AI returns structured data
    return {
      outlineText: response,
      createdAt: new Date().toISOString(),
    }
  }
} 