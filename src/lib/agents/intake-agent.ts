import { Agent, AgentContext, AgentResult } from './types'
import { aiService } from '../ai/service'
import { documentTools } from '../ai/document-tools'
import { ModelId } from '../ai/providers'

export class DocumentIntakeAgent implements Agent {
  name = 'Document Intake Agent'
  description = 'Analyzes and extracts key information from source documents using full context'

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now()
    let tokensUsed = 0
    const documentsAccessed: string[] = []

    try {
      // First, get document list and metadata
      const prompt = `I need to analyze documents for creating: "${context.goal}"

Please use the available tools to:
1. List all available documents
2. Retrieve the full content of documents: ${context.documentIds.join(', ')}
3. Analyze each document for:
   - Main topics and themes
   - Key facts and data points
   - Important quotes or statements
   - Document structure and organization
   - Writing style and tone
   - Relevance to the goal

Provide a comprehensive analysis that will inform the document creation process.`

      const result = await aiService.generateText(prompt, {
        model: (context.preferredModel as ModelId) || 'gemini-2.5-pro',
        temperature: 0.3,
        systemPrompt: `You are an expert document analyst. Use the available tools to access and analyze documents systematically. 
        
        Focus on extracting information that will be valuable for creating: "${context.goal}"
        
        Be thorough in your analysis and provide structured insights.`,
        tools: documentTools,
      })

      tokensUsed = 5000 // Estimate based on full document analysis

      // Extract document IDs from tool calls
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

      // Parse the analysis from the AI response
      const analysis = this.parseAnalysisFromResponse(result.text)

      return {
        agentName: this.name,
        output: {
          analysis,
          documentsAnalyzed: documentsAccessed.length,
          toolCallsUsed: result.toolCalls?.length || 0,
          fullAnalysisText: result.text,
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
          model: context.preferredModel || 'gemini-2.5-pro',
          documentsAccessed,
          toolCalls: [],
        },
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private parseAnalysisFromResponse(response: string): Record<string, unknown> {
    // Extract structured information from the AI response
    // This could be enhanced with more sophisticated parsing
    return {
      summary: response,
      extractedAt: new Date().toISOString(),
    }
  }
} 