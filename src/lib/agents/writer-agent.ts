import { Agent, AgentContext, AgentResult } from './types'
import { aiService } from '../ai/service'
import { documentTools } from '../ai/document-tools'
import { ModelId } from '../ai/providers'

export class ParagraphWriterAgent implements Agent {
  name = 'Paragraph Writer Agent'
  description = 'Writes content with full access to source documents for accurate, grounded writing'

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now()
    let tokensUsed = 0
    const documentsAccessed: string[] = []

    try {
      const outline = context.previousResults?.outlineAgent as Record<string, unknown> | undefined
      if (!outline || !outline.outlineText) {
        throw new Error('No outline available')
      }

      const prompt = `Write a comprehensive document based on the outline and full access to source documents.

Goal: ${context.goal}
Style: ${context.style || 'Professional and informative'}

Outline:
${outline.outlineText}

Instructions:
1. Use the document tools to access full content from source documents
2. Write engaging, well-structured content following the outline
3. Include specific facts, quotes, and data from the source documents
4. Maintain consistency throughout the document
5. Ensure smooth transitions between sections
6. Cite sources naturally within the text
7. Create a complete, publication-ready document

Use the available tools to access documents and create a structured outline.`

      const result = await aiService.generateText(prompt, {
        model: (context.preferredModel as ModelId) || 'claude-4-sonnet',
        temperature: 0.7,
        maxTokens: context.maxTokens || 4096,
        systemPrompt: `You are an expert writer with access to full source documents. 
        
        Create high-quality, well-researched content that is engaging and informative.
        Use the document tools to access complete source material and write comprehensive, grounded content.
        
        Focus on creating: "${context.goal}"
        
        Write naturally and engagingly while maintaining accuracy and proper attribution.`,
        tools: documentTools,
      })

      tokensUsed = 25000 // Estimate for full document writing

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

      return {
        agentName: this.name,
        output: {
          document: result.text,
          wordCount: result.text.split(/\s+/).length,
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
} 