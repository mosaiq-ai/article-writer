import { Agent, AgentContext, AgentResult } from './types'
import { aiService } from '../ai/service'
import { documentTools } from '../ai/document-tools'
import { ModelId } from '../ai/providers'

interface EnhancementResult {
  finalDocument: string
  executiveSummary: string
  improvements: string[]
  factCheckResults: string
}

export class ContentSynthesizerAgent implements Agent {
  name = 'Content Synthesizer Agent'
  description = 'Reviews and enhances document with access to original sources for fact-checking'

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now()
    let tokensUsed = 0
    const documentsAccessed: string[] = []

    try {
      const writtenContent = context.previousResults?.writerAgent as Record<string, unknown> | undefined
      if (!writtenContent || !writtenContent.document) {
        throw new Error('No written content available')
      }

      const prompt = `Review and enhance this document with access to the original source materials.

Document Goal: ${context.goal}
Current Document:
${writtenContent.document}

Tasks:
1. Use document tools to verify facts against original sources
2. Check for accuracy and completeness
3. Improve coherence and flow
4. Ensure consistent style and tone
5. Add any missing important information from sources
6. Create an executive summary
7. Provide final recommendations

Use the available tools to access source documents: ${context.documentIds.join(', ')}

Provide the enhanced document along with your analysis and recommendations.`

      const result = await aiService.generateText(prompt, {
        model: (context.preferredModel as ModelId) || 'gpt-4.1',
        temperature: 0.3,
        maxTokens: context.maxTokens || 4096,
        systemPrompt: `You are an expert editor and fact-checker with access to original source documents.
        
        Review and enhance the document while maintaining its core message and structure.
        Use the document tools to verify information and ensure accuracy.
        
        Focus on improving: "${context.goal}"
        
        Provide comprehensive feedback and an enhanced version.`,
        tools: documentTools,
      })

      tokensUsed = 30000 // Estimate for comprehensive review and enhancement

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

      const enhancement = this.parseEnhancementFromResponse(result.text)

      return {
        agentName: this.name,
        output: {
          finalDocument: enhancement.finalDocument,
          executiveSummary: enhancement.executiveSummary,
          improvements: enhancement.improvements,
          factCheckResults: enhancement.factCheckResults,
          metadata: {
            finalWordCount: enhancement.finalDocument.split(/\s+/).length,
            originalWordCount: writtenContent.wordCount,
            documentsVerified: documentsAccessed.length,
          },
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
          model: context.preferredModel || 'gpt-4.1',
          documentsAccessed,
          toolCalls: [],
        },
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private parseEnhancementFromResponse(response: string): EnhancementResult {
    // Parse the AI response to extract enhanced document and analysis
    // This could be enhanced with more sophisticated parsing
    return {
      finalDocument: response, // Simplified - would need better parsing
      executiveSummary: 'Generated summary would be extracted here',
      improvements: ['Improvements would be listed here'],
      factCheckResults: 'Fact-check results would be extracted here',
    }
  }
} 