import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

// Debug logging for API keys (only in development)
if (process.env.NODE_ENV === "development") {
  console.log("API Key Check:")
  console.log("- OpenAI:", process.env.OPENAI_API_KEY ? "Available" : "Missing")
  console.log("- Anthropic:", process.env.ANTHROPIC_API_KEY ? "Available" : "Missing")
  console.log("- Google:", process.env.GOOGLE_AI_API_KEY ? "Available" : "Missing")
}

// OpenAI Configuration
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: "strict",
})

// Anthropic Configuration
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Google AI Configuration
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
})

// Model definitions with capabilities and context limits
export const models = {
  // GPT-4 for complex reasoning and analysis
  "gpt-4.1": {
    provider: openai,
    modelId: "gpt-4.1",
    maxTokens: 14096,
    contextWindow: 128000,
    capabilities: ["reasoning", "analysis", "code", "long-context"],
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
  },
  // Claude 3.7 Sonnet for creative writing and synthesis
  "claude-4-sonnet": {
    provider: anthropic,
    modelId: "claude-sonnet-4-20250514",
    maxTokens: 8192,
    contextWindow: 200000,
    capabilities: ["writing", "synthesis", "long-context", "nuanced"],
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  // Gemini 1.5 Flash for free tier usage
  "gemini-2.5-pro": {
    provider: google,
    modelId: "gemini-2.5-pro-preview-05-06",
    maxTokens: 8192,
    contextWindow: 1000000,
    capabilities: ["research", "multimodal", "ultra-long-context", "full-document"],
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
  },
} as const

export type ModelId = keyof typeof models
