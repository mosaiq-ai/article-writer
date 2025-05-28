import { streamText, generateText, CoreTool } from "ai"
import { models, ModelId } from "./providers"

export interface AIServiceOptions {
  model?: ModelId
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  tools?: Record<string, CoreTool>
}

export interface AIGenerateResult {
  text: string
  model: ModelId
  toolCalls?: unknown[]
  toolResults?: unknown[]
}

export class AIService {
  private defaultModel: ModelId = "gpt-4.1" // Default to GPT-4.1 for reliable access

  async generateText(prompt: string, options: AIServiceOptions = {}): Promise<AIGenerateResult> {
    const { model = this.defaultModel, temperature = 0.7, maxTokens, systemPrompt, tools } = options
    const selectedModel = models[model]

    try {
      const { text, toolCalls, toolResults } = await generateText({
        model: selectedModel.provider(selectedModel.modelId),
        messages: [
          ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
          { role: "user" as const, content: prompt },
        ],
        temperature,
        maxTokens: maxTokens || selectedModel.maxTokens,
        tools,
        maxSteps: 5, // Allow multiple tool calls and responses
      })

      return { text, model, toolCalls, toolResults }
    } catch (error) {
      console.error(`Error with ${model}:`, error)
      // Fallback to another model if available
      if (model !== this.defaultModel) {
        return this.generateText(prompt, { ...options, model: this.defaultModel })
      }
      throw error
    }
  }

  async streamText(prompt: string, options: AIServiceOptions = {}): Promise<unknown> {
    const { model = this.defaultModel, temperature = 0.7, maxTokens, systemPrompt, tools } = options
    const selectedModel = models[model]

    try {
      const result = await streamText({
        model: selectedModel.provider(selectedModel.modelId),
        messages: [
          ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
          { role: "user" as const, content: prompt },
        ],
        temperature,
        maxTokens: maxTokens || selectedModel.maxTokens,
        tools,
      })

      return result
    } catch (error) {
      console.error(`Streaming error with ${model}:`, error)
      if (model !== this.defaultModel) {
        return this.streamText(prompt, { ...options, model: this.defaultModel })
      }
      throw error
    }
  }

  // Model selection based on task and content size
  selectModelForTask(task: string, contentSize: number = 0): ModelId {
    // For very large content, use Gemini 2.5 Pro
    if (contentSize > 100000) {
      return "gemini-2.5-pro"
    }

    const taskModelMap: Record<string, ModelId> = {
      analysis: "gpt-4.1",
      writing: "claude-4-sonnet",
      research: "gemini-2.5-pro",
      outline: "claude-4-sonnet",
      synthesis: "claude-4-sonnet",
      "full-document": "gemini-2.5-pro",
    }
    return taskModelMap[task] || this.defaultModel
  }

  // Estimate token count for content
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  // Check if content fits in model context
  canFitInContext(text: string, model: ModelId): boolean {
    const tokens = this.estimateTokens(text)
    return tokens < models[model].contextWindow * 0.8 // Leave 20% buffer
  }
}

export const aiService = new AIService()
