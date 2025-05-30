import { Agent, AgentContext, AgentResult } from "./types"
import { aiService } from "../ai/service"
import { documentTools } from "../ai/document-tools"
import { ModelId } from "../ai/providers"

interface EnhancementResult {
  finalDocument: string
  executiveSummary: string
  improvements: string[]
  factCheckResults: string
}

export class ContentSynthesizerAgent implements Agent {
  name = "Content Synthesizer Agent"
  description = "Reviews and enhances document with access to original sources for fact-checking"

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now()
    let tokensUsed = 0
    const documentsAccessed: string[] = []

    try {
      const writtenContent = context.previousResults?.writerAgent as
        | Record<string, unknown>
        | undefined
      if (!writtenContent || !writtenContent.document) {
        throw new Error("No written content available")
      }

      const prompt = `Review and enhance this document with access to the original source materials.

Document Goal: ${context.goal}
Current Document:
${writtenContent.document}

CONTENT ENHANCEMENT TASKS:
1. Use document tools to verify facts against original sources
2. Check for accuracy and completeness
3. Improve coherence and flow
4. Ensure consistent style and tone
5. Add any missing important information from sources
6. Create an executive summary
7. Provide final recommendations

FORMATTING & STRUCTURE REQUIREMENTS:
- Use proper heading hierarchy (H1 for title, H2 for main sections, H3 for subsections)
- Structure content with clear visual hierarchy using headings, paragraphs, and lists
- Use blockquotes for important quotes or key insights from source materials
- Create bulleted or numbered lists for actionable items, key points, or structured information
- Use bold text for emphasis on important terms or concepts
- Include tables when presenting structured data or comparisons
- Ensure proper paragraph breaks for readability
- Use horizontal rules (---) to separate major sections when appropriate

FORMAT OUTPUT AS:
Return a well-structured HTML document that will look professional in a modern rich text editor with beautiful typography. The content should be visually engaging and easy to read.

Source documents available: ${context.documentIds.join(", ")}

Provide the enhanced document along with your analysis and recommendations.`

      const result = await aiService.generateText(prompt, {
        model: (context.preferredModel as ModelId) || "gpt-4.1",
        temperature: 0.3,
        maxTokens: context.maxTokens || 4096,
        systemPrompt: `You are an expert editor, fact-checker, and document designer with access to original source documents.

CORE RESPONSIBILITIES:
- Review and enhance document content while maintaining its core message
- Use document tools to verify information and ensure accuracy
- Create visually appealing, well-structured content

FORMATTING EXPERTISE:
You output HTML content that will be displayed in a professionally styled rich text editor with:
- Beautiful typography with proper heading hierarchy
- Enhanced list styling with custom bullet points
- Professional blockquotes with left borders and backgrounds
- Elegant code blocks and inline code formatting
- Clean table styling with headers and borders
- Smooth hover effects and visual polish

CONTENT STRUCTURE GUIDELINES:
- Start with a compelling H1 title
- Use H2 headings for major sections
- Use H3 headings for subsections
- Break content into digestible paragraphs
- Use bullet lists for key points and action items
- Use numbered lists for step-by-step processes
- Include blockquotes for important insights or quotes from sources
- Use tables for structured data or comparisons
- Apply bold formatting to emphasize key terms
- Use horizontal rules to separate major sections

OUTPUT REQUIREMENTS:
- Generate clean, semantic HTML that leverages the rich formatting capabilities
- Focus on visual hierarchy and readability
- Ensure content looks professional and engaging
- Structure information for maximum impact and comprehension

Primary goal: "${context.goal}"

Provide comprehensive fact-checked content with an enhanced, visually appealing structure.`,
        tools: documentTools,
      })

      tokensUsed = 30000 // Estimate for comprehensive review and enhancement

      // Track accessed documents
      if (result.toolCalls) {
        ;(result.toolCalls as Record<string, unknown>[]).forEach((call) => {
          if (
            call.toolName === "getDocument" &&
            call.args &&
            typeof call.args === "object" &&
            call.args !== null &&
            "documentId" in call.args
          ) {
            documentsAccessed.push(call.args.documentId as string)
          }
          if (
            call.toolName === "getMultipleDocuments" &&
            call.args &&
            typeof call.args === "object" &&
            call.args !== null &&
            "documentIds" in call.args
          ) {
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
          toolCalls: (result.toolCalls as Record<string, unknown>[]) || [],
        },
        status: "success",
      }
    } catch (error) {
      return {
        agentName: this.name,
        output: null,
        metadata: {
          tokensUsed,
          timeElapsed: Date.now() - startTime,
          model: context.preferredModel || "gpt-4.1",
          documentsAccessed,
          toolCalls: [],
        },
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  private parseEnhancementFromResponse(response: string): EnhancementResult {
    // Parse the AI response to extract enhanced document and analysis
    // This could be enhanced with more sophisticated parsing
    return {
      finalDocument: response, // Simplified - would need better parsing
      executiveSummary: "Generated summary would be extracted here",
      improvements: ["Improvements would be listed here"],
      factCheckResults: "Fact-check results would be extracted here",
    }
  }
}
