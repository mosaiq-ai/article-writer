import { aiService } from "@/lib/ai/service"
import { ModelId } from "@/lib/ai/providers"
import { documentTools } from "@/lib/ai/document-tools"
import { documentStore } from "@/lib/documents/document-store"

export interface SelectionInfo {
  text: string
  from: number
  to: number
  isEmpty: boolean
  context: {
    before: string
    after: string
  }
  htmlContext?: {
    selectedHTML: string
    beforeHTML: string
    afterHTML: string
  }
}

export interface DocumentContext {
  sessionId?: string
  documentIds?: string[]
  currentDocumentTitle?: string
}

export interface AIEditResult {
  text: string
  model: ModelId
  action: string
  originalText: string
  sourcesUsed?: string[]
  toolCalls?: unknown[]
}

export type AIEditAction =
  | "improve"
  | "fix"
  | "simplify"
  | "expand"
  | "shorten"
  | "summarize"
  | "generate"
  | "custom"
  | "add_from_sources" // NEW: Add missing info from source docs
  | "verify_against_sources" // NEW: Check facts against sources
  | "expand_with_sources" // NEW: Expand using source material
  | "cite_sources" // NEW: Add citations from sources

export type ToneAction =
  | "professional"
  | "casual"
  | "formal"
  | "friendly"
  | "confident"
  | "diplomatic"

export type TranslateAction =
  | "spanish"
  | "french"
  | "german"
  | "chinese"
  | "japanese"
  | "italian"
  | "portuguese"

export class AIEditorService {
  private defaultModel: ModelId = "claude-4-sonnet" // Claude is excellent for writing tasks
  private maxInputTokens = 100000 // 100k token limit for input

  /**
   * Process a selection with an AI action, optionally using document context
   */
  async processSelection(
    selection: SelectionInfo,
    action: string,
    customPrompt?: string,
    model?: ModelId,
    documentContext?: DocumentContext
  ): Promise<AIEditResult> {
    const selectedModel = model || this.selectModelForAction(action)
    const prompt = await this.buildPrompt(action, selection, customPrompt, documentContext)

    // Check if content fits within our input limit
    if (!this.canFitInInputLimit(prompt)) {
      throw new Error("Content too large. Please select a smaller portion of text.")
    }

    const systemPrompt = this.getSystemPrompt(action, documentContext)

    // Use document tools for document-aware actions only if no specific documents are selected
    const useTools =
      this.needsDocumentTools(action) &&
      (!documentContext?.documentIds || documentContext.documentIds.length === 0)
    const tools = useTools ? documentTools : undefined

    console.log("🔍 AI SERVICE DEBUG: Calling AI with:")
    console.log("🔍 Model:", selectedModel)
    console.log("🔍 System prompt length:", systemPrompt.length)
    console.log("🔍 User prompt length:", prompt.length)
    console.log("🔍 Tools enabled:", !!tools)

    const result = await aiService.generateText(prompt, {
      model: selectedModel,
      temperature: this.getTemperatureForAction(action),
      systemPrompt,
      tools,
    })

    console.log("🔍 AI SERVICE DEBUG: AI Response received:")
    console.log("🔍 Response text length:", result.text.length)
    console.log("🔍 Raw AI response:", result.text)
    console.log("🔍 Tool calls:", result.toolCalls?.length || 0)

    // Extract sources used from tool calls or use the selected document IDs
    const sourcesUsed =
      documentContext?.documentIds && documentContext.documentIds.length > 0
        ? documentContext.documentIds
        : this.extractSourcesFromToolCalls(result.toolCalls)

    return {
      text: result.text.trim(),
      model: selectedModel,
      action,
      originalText: selection.text,
      sourcesUsed,
      toolCalls: result.toolCalls,
    }
  }

  /**
   * Stream process a selection for real-time results
   */
  async streamProcessSelection(
    selection: SelectionInfo,
    action: string,
    customPrompt?: string,
    model?: ModelId,
    documentContext?: DocumentContext
  ) {
    const selectedModel = model || this.selectModelForAction(action)
    const prompt = await this.buildPrompt(action, selection, customPrompt, documentContext)

    // Check if content fits within our input limit
    if (!this.canFitInInputLimit(prompt)) {
      throw new Error("Content too large. Please select a smaller portion of text.")
    }

    const systemPrompt = this.getSystemPrompt(action, documentContext)

    // Use document tools for document-aware actions only if no specific documents are selected
    const useTools =
      this.needsDocumentTools(action) &&
      (!documentContext?.documentIds || documentContext.documentIds.length === 0)
    const tools = useTools ? documentTools : undefined

    return await aiService.streamText(prompt, {
      model: selectedModel,
      temperature: this.getTemperatureForAction(action),
      systemPrompt,
      tools,
    })
  }

  /**
   * Check if an action needs document tools
   */
  private needsDocumentTools(action: string): boolean {
    const documentAwareActions = [
      "add_from_sources",
      "verify_against_sources",
      "expand_with_sources",
      "cite_sources",
    ]
    return documentAwareActions.includes(action.split(":")[0])
  }

  /**
   * Extract source document IDs from tool calls
   */
  private extractSourcesFromToolCalls(toolCalls?: unknown[]): string[] {
    if (!toolCalls) return []

    const sources: string[] = []
    for (const call of toolCalls) {
      if (typeof call === "object" && call !== null && "toolName" in call) {
        const toolCall = call as {
          toolName: string
          args?: { documentId?: string; documentIds?: string[] }
        }
        if (toolCall.toolName === "getDocument" && toolCall.args?.documentId) {
          sources.push(toolCall.args.documentId)
        }
        if (toolCall.toolName === "getMultipleDocuments" && toolCall.args?.documentIds) {
          sources.push(...toolCall.args.documentIds)
        }
      }
    }
    return [...new Set(sources)] // Remove duplicates
  }

  /**
   * Generate new content from scratch
   */
  async generateContent(
    prompt: string,
    context?: string,
    style?: string,
    model?: ModelId
  ): Promise<AIEditResult> {
    const selectedModel = model || this.selectModelForAction("generate")

    const fullPrompt = this.buildGenerationPrompt(prompt, context, style)

    // Check if content fits within our input limit
    if (!this.canFitInInputLimit(fullPrompt)) {
      throw new Error("Prompt and context too large. Please provide shorter content.")
    }

    const systemPrompt = this.getSystemPrompt("generate")

    const result = await aiService.generateText(fullPrompt, {
      model: selectedModel,
      temperature: 0.8, // Higher creativity for generation
      systemPrompt,
      // Remove maxTokens - let models use their own output limits
    })

    return {
      text: result.text.trim(),
      model: selectedModel,
      action: "generate",
      originalText: "",
    }
  }

  /**
   * Build prompt based on action type
   */
  private async buildPrompt(
    action: string,
    selection: SelectionInfo,
    customPrompt?: string,
    documentContext?: DocumentContext
  ): Promise<string> {
    const { text, context, htmlContext } = selection

    // Handle compound actions (tone:professional, translate:spanish)
    if (action.includes(":")) {
      const [actionType, actionValue] = action.split(":")

      if (actionType === "tone") {
        return this.buildTonePrompt(
          text,
          actionValue as ToneAction,
          context,
          htmlContext || { selectedHTML: "", beforeHTML: "", afterHTML: "" }
        )
      }

      if (actionType === "translate") {
        return this.buildTranslatePrompt(
          text,
          actionValue as TranslateAction,
          context,
          htmlContext || { selectedHTML: "", beforeHTML: "", afterHTML: "" }
        )
      }
    }

    // Document-aware actions
    if (this.needsDocumentTools(action)) {
      return await this.buildDocumentAwarePrompt(action, selection, documentContext, customPrompt)
    }

    // Build HTML context information for ALL actions
    const htmlContextInfo = htmlContext
      ? `

🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

ORIGINAL HTML STRUCTURE (MUST BE PRESERVED EXACTLY):
${htmlContext.selectedHTML}

SURROUNDING CONTEXT:
Before: ${htmlContext.beforeHTML}
After: ${htmlContext.afterHTML}

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure
2. If original uses <p> tags, maintain <p> tags
3. If original uses <h2>, <h3>, etc., maintain exact heading levels
4. If original has <ul><li> structure, preserve that exact pattern
5. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
6. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
7. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
8. Maintain all attributes, classes, and existing styling
9. Output must integrate seamlessly with the surrounding HTML context
10. **CRITICAL: Copy the Original HTML Structure's formatting pattern EXACTLY**

⚠️ SPECIAL TABLE PRESERVATION WARNING:
If the Original HTML Structure contains a <table>, you MUST:
- Preserve the exact table formatting (compressed/expanded)
- Keep ALL style attributes identical (style="min-width: 75px")
- Keep ALL colgroup and col elements exactly as they appear
- Keep ALL colspan and rowspan attributes identical
- Do NOT add extra whitespace or pretty-printing to table HTML
- The table structure MUST be byte-for-byte identical except for translated text

CRITICAL: Match the Original HTML Structure's formatting pattern exactly - do not beautify or reformat.`
      : ""

    // Standard actions
    const actionPrompts: Record<AIEditAction, string> = {
      improve: `Improve the following text for better clarity, flow, and impact. Keep the core meaning but enhance the writing quality.

ORIGINAL TEXT: "${text}"

SURROUNDING CONTEXT:
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

IMPROVEMENT INSTRUCTIONS:
${
  htmlContext
    ? `🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure shown above
2. Only improve word choice, clarity, and flow within the existing HTML framework
3. DO NOT change any HTML tags, hierarchy, or structure
4. If original uses <p> tags, maintain <p> tags exactly
5. If original uses <h2>, <h3>, etc., maintain exact heading levels
6. If original has <ul><li> structure, preserve that exact pattern
7. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
8. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
9. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
10. Maintain all attributes, classes, and existing styling
11. Return improved content using the IDENTICAL formatting pattern

⚠️ SPECIAL TABLE PRESERVATION WARNING:
If the Original HTML Structure contains a <table>, you MUST:
- Preserve the exact table formatting (compressed/expanded)
- Keep ALL style attributes identical
- Keep ALL colgroup and col elements exactly as they appear
- Keep ALL colspan and rowspan attributes identical
- Do NOT add extra whitespace or pretty-printing to table HTML
- The table structure MUST be byte-for-byte identical except for improved text

CRITICAL: Match the Original HTML Structure's formatting pattern exactly - do not beautify or reformat.`
    : "1. Focus on improving word choice, clarity, and flow\n2. Maintain the original meaning and style\n3. Return properly formatted HTML for the improved text"
}

${customPrompt ? `\nAdditional Instructions: ${customPrompt}` : ""}

Improved content:`,

      fix: `Fix all grammar, spelling, punctuation, and syntax errors in the following text. Maintain the original meaning and style.

ORIGINAL TEXT: "${text}"

SURROUNDING CONTEXT:
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

CORRECTION INSTRUCTIONS:
${
  htmlContext
    ? `🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure shown above
2. Fix errors within the existing HTML formatting framework
3. DO NOT modify any HTML tags or structure
4. If original uses <p> tags, maintain <p> tags exactly
5. If original uses <h2>, <h3>, etc., maintain exact heading levels
6. If original has <ul><li> structure, preserve that exact pattern
7. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
8. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
9. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
10. Maintain all attributes, classes, and existing styling
11. Return corrected content with identical formatting

⚠️ SPECIAL TABLE PRESERVATION WARNING:
If the Original HTML Structure contains a <table>, you MUST:
- Preserve the exact table formatting (compressed/expanded)
- Keep ALL style attributes identical
- Keep ALL colgroup and col elements exactly as they appear
- Keep ALL colspan and rowspan attributes identical
- Do NOT add extra whitespace or pretty-printing to table HTML
- The table structure MUST be byte-for-byte identical except for corrected text

CRITICAL: Match the Original HTML Structure's formatting pattern exactly - do not beautify or reformat.`
    : "1. Correct all errors while preserving meaning and style\n2. Return properly formatted HTML"
}

Corrected content:`,

      simplify: `Simplify the following text to make it clearer and easier to understand. Use simpler words and shorter sentences while keeping the key meaning.

ORIGINAL TEXT: "${text}"

SURROUNDING CONTEXT:
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

SIMPLIFICATION INSTRUCTIONS:
${
  htmlContext
    ? `🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure shown above
2. Simplify content within the existing HTML formatting
3. DO NOT change HTML tags or structure
4. If original uses <p> tags, maintain <p> tags exactly
5. If original uses <h2>, <h3>, etc., maintain exact heading levels
6. If original has <ul><li> structure, preserve that exact pattern
7. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
8. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
9. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
10. Maintain all attributes, classes, and existing styling
11. Return simplified content using the same formatting pattern

⚠️ SPECIAL TABLE PRESERVATION WARNING:
If the Original HTML Structure contains a <table>, you MUST:
- Preserve the exact table formatting (compressed/expanded)
- Keep ALL style attributes identical
- Keep ALL colgroup and col elements exactly as they appear
- Keep ALL colspan and rowspan attributes identical
- Do NOT add extra whitespace or pretty-printing to table HTML
- The table structure MUST be byte-for-byte identical except for simplified text

CRITICAL: Match the Original HTML Structure's formatting pattern exactly - do not beautify or reformat.`
    : "1. Use simpler language while preserving key information\n2. Return clean, well-structured HTML"
}

Simplified content:`,

      expand: `Expand the following text with more detail, examples, and elaboration. Add depth while maintaining the core message.

ORIGINAL TEXT: "${text}"

SURROUNDING CONTEXT:
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

EXPANSION INSTRUCTIONS:
${
  htmlContext
    ? `🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure shown above
2. Add content using the EXACT same HTML structure and formatting
3. If expanding lists, add items with identical <li> formatting
4. If expanding paragraphs, use matching <p> tag structure
5. If original uses <h2>, <h3>, etc., maintain exact heading levels
6. If original has <ul><li> structure, preserve that exact pattern
7. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
8. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
9. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
10. Maintain all attributes, classes, and existing styling
11. Maintain perfect formatting consistency with the original

⚠️ SPECIAL TABLE PRESERVATION WARNING:
If the Original HTML Structure contains a <table>, you MUST:
- Preserve the exact table formatting (compressed/expanded)
- Keep ALL style attributes identical
- Keep ALL colgroup and col elements exactly as they appear
- Keep ALL colspan and rowspan attributes identical
- Do NOT add extra whitespace or pretty-printing to table HTML
- The table structure MUST be byte-for-byte identical except for expanded text

CRITICAL: Match the Original HTML Structure's formatting pattern exactly - do not beautify or reformat.`
    : "1. Add relevant detail and examples\n2. Use proper HTML structure with headings, lists, and emphasis as appropriate"
}

Expanded content:`,

      shorten: `Make the following text more concise while preserving all essential information and key points.

ORIGINAL TEXT: "${text}"

SURROUNDING CONTEXT:
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

CONDENSATION INSTRUCTIONS:
${
  htmlContext
    ? `🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure shown above
2. Remove unnecessary words while keeping the HTML formatting identical
3. DO NOT change any HTML tags or structure
4. If original uses <p> tags, maintain <p> tags exactly
5. If original uses <h2>, <h3>, etc., maintain exact heading levels
6. If original has <ul><li> structure, preserve that exact pattern
7. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
8. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
9. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
10. Maintain all attributes, classes, and existing styling
11. Return concise content within the existing formatting framework

⚠️ SPECIAL TABLE PRESERVATION WARNING:
If the Original HTML Structure contains a <table>, you MUST:
- Preserve the exact table formatting (compressed/expanded)
- Keep ALL style attributes identical
- Keep ALL colgroup and col elements exactly as they appear
- Keep ALL colspan and rowspan attributes identical
- Do NOT add extra whitespace or pretty-printing to table HTML
- The table structure MUST be byte-for-byte identical except for shortened text

CRITICAL: Match the Original HTML Structure's formatting pattern exactly - do not beautify or reformat.`
    : "1. Preserve essential information while reducing word count\n2. Maintain clear structure and formatting"
}

Condensed content:`,

      summarize: `Create a clear, concise summary of the following text that captures the main points.

ORIGINAL TEXT: "${text}"

SURROUNDING CONTEXT:
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

SUMMARIZATION INSTRUCTIONS:
${
  htmlContext
    ? `🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure shown above
2. Create summary content that fits within the existing HTML framework
3. Maintain the same type of HTML tags and structure
4. If original uses <p> tags, maintain <p> tags exactly
5. If original uses <h2>, <h3>, etc., maintain exact heading levels
6. If original has <ul><li> structure, preserve that exact pattern
7. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
8. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
9. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
10. Maintain all attributes, classes, and existing styling
11. Return summary with formatting that matches the original pattern

⚠️ SPECIAL TABLE PRESERVATION WARNING:
If the Original HTML Structure contains a <table>, you MUST:
- Preserve the exact table formatting (compressed/expanded)
- Keep ALL style attributes identical
- Keep ALL colgroup and col elements exactly as they appear
- Keep ALL colspan and rowspan attributes identical
- Do NOT add extra whitespace or pretty-printing to table HTML
- The table structure MUST be byte-for-byte identical except for summarized text

CRITICAL: Match the Original HTML Structure's formatting pattern exactly - do not beautify or reformat.`
    : "1. Capture key points and main ideas\n2. Use appropriate HTML structure for readability"
}

Summary:`,

      generate: `Generate relevant content based on the context and requirements provided.

GENERATION INSTRUCTIONS:
1. Create high-quality, relevant content
2. Use appropriate HTML structure and formatting
3. Ensure content flows well with surrounding context

Generated content:`,

      custom: `${customPrompt}

Apply this instruction to the following text:

ORIGINAL TEXT: "${text}"

SURROUNDING CONTEXT:
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

CUSTOM EDIT INSTRUCTIONS:
${
  htmlContext
    ? `🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure shown above
2. Apply the custom instruction within the existing HTML framework
3. DO NOT modify any HTML tags or structure
4. If original uses <p> tags, maintain <p> tags exactly
5. If original uses <h2>, <h3>, etc., maintain exact heading levels
6. If original has <ul><li> structure, preserve that exact pattern
7. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
8. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
9. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
10. Maintain all attributes, classes, and existing styling
11. Return edited content with identical formatting

⚠️ SPECIAL TABLE PRESERVATION WARNING:
If the Original HTML Structure contains a <table>, you MUST:
- Preserve the exact table formatting (compressed/expanded)
- Keep ALL style attributes identical
- Keep ALL colgroup and col elements exactly as they appear
- Keep ALL colspan and rowspan attributes identical
- Do NOT add extra whitespace or pretty-printing to table HTML
- The table structure MUST be byte-for-byte identical except for custom-edited text

CRITICAL: Match the Original HTML Structure's formatting pattern exactly - do not beautify or reformat.`
    : "1. Follow the custom instruction precisely\n2. Return properly formatted HTML"
}

Edited content:`,

      add_from_sources: ``, // Handled by buildDocumentAwarePrompt
      verify_against_sources: ``, // Handled by buildDocumentAwarePrompt
      expand_with_sources: ``, // Handled by buildDocumentAwarePrompt
      cite_sources: ``, // Handled by buildDocumentAwarePrompt
    }

    return actionPrompts[action as AIEditAction] || actionPrompts.improve
  }

  /**
   * Build prompts for document-aware actions
   */
  private async buildDocumentAwarePrompt(
    action: string,
    selection: SelectionInfo,
    documentContext?: DocumentContext,
    customPrompt?: string
  ): Promise<string> {
    const { text, context, htmlContext } = selection
    const sessionContext = documentContext?.sessionId
      ? `Session ID: ${documentContext.sessionId}`
      : ""

    console.log("🔍 PROMPT DEBUG: Building document-aware prompt")
    console.log("🔍 Action:", action)
    console.log("🔍 Selected text:", text)
    console.log("🔍 HTML Context received:", htmlContext)

    // Add custom instructions if provided
    const customInstructions = customPrompt ? `\n\nAdditional Instructions: ${customPrompt}` : ""

    // If specific documents are selected, include their content directly
    let documentContent = ""
    let documentInfo = "available source documents"

    if (documentContext?.documentIds && documentContext.documentIds.length > 0) {
      documentInfo = `${documentContext.documentIds.length} selected document${documentContext.documentIds.length > 1 ? "s" : ""}`

      try {
        const documents = await Promise.all(
          documentContext.documentIds.map(async (id) => {
            const doc = await documentStore.retrieve(id)
            return doc ? `### Document: ${doc.title}\n\n${doc.content}\n\n` : null
          })
        )

        const validDocuments = documents.filter(Boolean)
        if (validDocuments.length > 0) {
          documentContent = `\n\nSELECTED SOURCE DOCUMENTS:\n${validDocuments.join("\n---\n\n")}`
        }
      } catch (error) {
        console.error("Failed to retrieve selected documents:", error)
        documentContent = "\n\n(Error retrieving selected documents - using search tools instead)"
      }
    }

    // Build HTML context information for formatting preservation
    const htmlContextInfo = htmlContext
      ? `

🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

ORIGINAL HTML STRUCTURE (MUST BE PRESERVED EXACTLY):
${htmlContext.selectedHTML}

SURROUNDING CONTEXT:
Before: ${htmlContext.beforeHTML}
After: ${htmlContext.afterHTML}

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure
2. If original uses <p> tags, maintain <p> tags
3. If original uses <h2>, <h3>, etc., maintain exact heading levels
4. If original has <ul><li> structure, preserve that exact pattern
5. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
6. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
7. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
8. Maintain all attributes, classes, and existing styling
9. Output must integrate seamlessly with the surrounding HTML context
10. **CRITICAL: Copy the Original HTML Structure's formatting pattern EXACTLY**

⚠️ SPECIAL TABLE PRESERVATION WARNING:
If the Original HTML Structure contains a <table>, you MUST:
- Preserve the exact table formatting (compressed/expanded)
- Keep ALL style attributes identical (style="min-width: 75px")
- Keep ALL colgroup and col elements exactly as they appear
- Keep ALL colspan and rowspan attributes identical
- Do NOT add extra whitespace or pretty-printing to table HTML
- The table structure MUST be byte-for-byte identical except for translated text

CRITICAL: Match the Original HTML Structure's formatting pattern exactly - do not beautify or reformat.`
      : ""

    const documentPrompts: Record<string, string> = {
      expand_with_sources: `You are a content developer who expands text using specific information from source documents. Use document tools to find relevant details.

ORIGINAL TEXT TO EXPAND: "${text}"

SURROUNDING CONTEXT (for reference):
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

${sessionContext}
Available documents: ${documentInfo}${customInstructions}${documentContent}

EXPANSION INSTRUCTIONS:
1. FIRST: Analyze the Original HTML Structure above to understand the exact formatting pattern
2. Add new content that follows the EXACT same HTML pattern and structure
3. If expanding a list, add new <li> items with identical formatting
4. If expanding paragraphs, add new <p> tags with the same structure
5. DO NOT change any existing formatting or tag structure
6. Return HTML that looks like it was written as one continuous piece with the original

The expansion must seamlessly integrate with the existing content using identical HTML formatting.

Expanded content:`,

      add_from_sources: `You are a research-focused editor who enhances text with relevant information from source documents. Use document tools to find and integrate supporting material.

ORIGINAL TEXT TO ENHANCE: "${text}"

SURROUNDING CONTEXT (for reference):
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

${sessionContext}
Available documents: ${documentInfo}${customInstructions}${documentContent}

ENHANCEMENT INSTRUCTIONS:
1. FIRST: Study the Original HTML Structure to understand the exact formatting pattern
2. Add information using the IDENTICAL HTML tags and structure
3. If the original has specific formatting patterns, replicate them exactly
4. DO NOT modify any existing HTML structure or hierarchy
5. Integrate new information seamlessly within the existing formatting framework
6. Return content that maintains perfect visual consistency with the original

Enhanced content:`,

      verify_against_sources: `You are a fact-checker who verifies information against source documents. Use document tools to check accuracy and correct any errors.

ORIGINAL TEXT TO VERIFY: "${text}"

SURROUNDING CONTEXT (for reference):
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

${sessionContext}
Available documents: ${documentInfo}${customInstructions}${documentContent}

VERIFICATION INSTRUCTIONS:
1. FIRST: Preserve the Original HTML Structure exactly as shown
2. ONLY correct factual content - NEVER modify HTML formatting
3. Keep every HTML tag, attribute, and structure element identical
4. If corrections are needed, make them within the existing HTML framework
5. Return content with ZERO visual or structural differences from the original
6. Maintain perfect formatting consistency

Verified content:`,

      cite_sources: `You are an academic editor who adds proper citations and references. Use document tools to identify and reference source materials.

ORIGINAL TEXT TO CITE: "${text}"

SURROUNDING CONTEXT (for reference):
Before: "${context.before}"
After: "${context.after}"${htmlContextInfo}

${sessionContext}
Available documents: ${documentInfo}${customInstructions}${documentContent}

CITATION INSTRUCTIONS:
1. FIRST: Maintain the Original HTML Structure exactly as provided
2. Add citations without disrupting any existing HTML formatting
3. Use minimal citation formats that integrate seamlessly (e.g., superscript numbers)
4. Keep all existing HTML tags and structure completely unchanged
5. Citations should enhance, not replace, the existing formatting
6. Return content that looks identical to the original with added citations

Content with citations:`,
    }

    const finalPrompt = documentPrompts[action] || documentPrompts.add_from_sources

    console.log("🔍 PROMPT DEBUG: Final prompt being sent to AI:")
    console.log("🔍", finalPrompt.substring(0, 500) + "...")
    console.log("🔍 HTML Context Info included:", !!htmlContextInfo)

    return finalPrompt
  }

  private buildTonePrompt(
    text: string,
    tone: ToneAction,
    context: { before: string; after: string },
    htmlContext: { selectedHTML: string; beforeHTML: string; afterHTML: string }
  ): string {
    const toneInstructions: Record<ToneAction, string> = {
      professional: "formal, polished, and business-appropriate",
      casual: "relaxed, conversational, and informal",
      formal: "structured, official, and respectful",
      friendly: "warm, approachable, and personable",
      confident: "assertive, decisive, and self-assured",
      diplomatic: "tactful, balanced, and considerate",
    }

    return `Rewrite the following text to be more ${toneInstructions[tone]}:

"${text}"

Context before: "${context.before}"
Context after: "${context.after}"

Maintain the core meaning while adjusting the tone. Return the rewritten text as properly formatted HTML, preserving the original formatting structure while adapting the tone.

${
  htmlContext
    ? `

🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

ORIGINAL HTML STRUCTURE (MUST BE PRESERVED EXACTLY):
${htmlContext.selectedHTML}

SURROUNDING CONTEXT:
Before: ${htmlContext.beforeHTML}
After: ${htmlContext.afterHTML}

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure
2. If original uses <p> tags, maintain <p> tags
3. If original uses <h2>, <h3>, etc., maintain exact heading levels
4. If original has <ul><li> structure, preserve that exact pattern
5. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
6. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
7. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
8. Maintain all attributes, classes, and existing styling
9. Output must integrate seamlessly with the surrounding HTML context
10. **CRITICAL: Copy the Original HTML Structure's formatting pattern EXACTLY**

⚠️ SPECIAL TABLE PRESERVATION WARNING:
If the Original HTML Structure contains a <table>, you MUST:
- Preserve the exact table formatting (compressed/expanded)
- Keep ALL style attributes identical (style="min-width: 75px")
- Keep ALL colgroup and col elements exactly as they appear
- Keep ALL colspan and rowspan attributes identical
- Do NOT add extra whitespace or pretty-printing to table HTML
- The table structure MUST be byte-for-byte identical except for translated text

CRITICAL: Match the Original HTML Structure's formatting pattern exactly - do not beautify or reformat.`
    : ""
}`
  }

  private buildTranslatePrompt(
    text: string,
    language: TranslateAction,
    context: { before: string; after: string },
    htmlContext: { selectedHTML: string; beforeHTML: string; afterHTML: string }
  ): string {
    const languages: Record<TranslateAction, string> = {
      spanish: "Spanish",
      french: "French",
      german: "German",
      chinese: "Chinese (Simplified)",
      japanese: "Japanese",
      italian: "Italian",
      portuguese: "Portuguese",
    }

    return `Translate the following text to ${languages[language]}. Maintain the style and tone of the original:

"${text}"

Context before: "${context.before}"
Context after: "${context.after}"

Return the translated text as properly formatted HTML, preserving all formatting elements and structure from the original.

${
  htmlContext
    ? `

🚨 CRITICAL HTML FORMATTING PRESERVATION - TABLES INCLUDED 🚨

ORIGINAL HTML STRUCTURE (MUST BE PRESERVED EXACTLY):
${htmlContext.selectedHTML}

SURROUNDING CONTEXT:
Before: ${htmlContext.beforeHTML}
After: ${htmlContext.afterHTML}

MANDATORY FORMATTING PRESERVATION RULES:
1. Return EXACTLY the same HTML tags and structure as the Original HTML Structure
2. If original uses <p> tags, maintain <p> tags
3. If original uses <h2>, <h3>, etc., maintain exact heading levels
4. If original has <ul><li> structure, preserve that exact pattern
5. **TABLES: Preserve EVERY table attribute exactly (style, min-width, colspan, rowspan)**
6. **TABLES: Do NOT add any whitespace, indentation, or line breaks to table HTML**
7. **TABLES: Keep table structure IDENTICAL - same number of rows/columns**
8. Maintain all attributes, classes, and existing styling
9. Output must integrate seamlessly with the surrounding HTML context
10. **CRITICAL: Copy the Original HTML Structure's formatting pattern EXACTLY**

⚠️ SPECIAL TABLE PRESERVATION RULES:
When translating content with tables:
- NEVER add whitespace, indentation, or line breaks to table HTML
- Keep table structure byte-for-byte identical except for translated text
- Preserve ALL table attributes exactly (style, min-width, colspan, rowspan)
- Keep colgroup and col elements exactly as they appear
- Do NOT beautify or reformat table HTML - keep it compressed if original is compressed

CRITICAL: If the original HTML contains tables, your output must have IDENTICAL table structure formatting.
`
    : ""
}`
  }

  private buildGenerationPrompt(prompt: string, context?: string, style?: string): string {
    let fullPrompt = `Generate content based on this request: ${prompt}`

    if (context) {
      fullPrompt += `\n\nContext: ${context}`
    }

    if (style) {
      fullPrompt += `\n\nStyle: ${style}`
    }

    fullPrompt +=
      "\n\nGenerate relevant, high-quality content that fulfills this request. Return the content as properly formatted HTML using semantic tags (<h1>-<h6>, <p>, <ul>, <ol>, <li>, <strong>, <em>, etc.) to create professional, readable formatting."

    return fullPrompt
  }

  /**
   * Get system prompt for different action types
   */
  private getSystemPrompt(action: string, documentContext?: DocumentContext): string {
    const actionType = action.split(":")[0]

    const basePrompts: Record<string, string> = {
      improve: `You are an expert editor focused on improving writing quality, clarity, and flow. Always maintain the original meaning while enhancing readability.

CRITICAL FORMATTING PRESERVATION RULE:
- PRESERVE the original formatting complexity level exactly
- If original is simple text, keep it as simple text
- If original has minimal formatting, maintain that minimal level
- DO NOT add new structural elements (headings, lists, etc.) unless they already exist
- Only improve word choice, clarity, and flow - NOT structure

FORMATTING REQUIREMENTS:
- Return content as properly formatted HTML that matches the original formatting level
- If original is plain text, return improved plain text in simple <p> tags
- If original has lists, preserve the exact list structure
- If original has headings, preserve the exact heading levels
- DO NOT transform plain text into complex HTML structures`,

      fix: `You are a meticulous proofreader. Fix all errors while preserving the original style and voice.

FORMATTING REQUIREMENTS:
- Return content as properly formatted HTML
- Preserve all existing formatting elements (headings, lists, emphasis, etc.)
- Fix any broken HTML structure while maintaining the original formatting intent
- Use proper semantic HTML tags`,

      simplify: `You are an expert at making complex text accessible. Simplify without losing important meaning.

FORMATTING REQUIREMENTS:
- Return content as clean, well-structured HTML
- Use simple formatting: <p> for paragraphs, <ul>/<li> for lists, <strong> for key points
- Maintain logical structure with proper headings if applicable
- Avoid complex formatting while keeping content readable`,

      expand: `You are a skilled writer who adds relevant detail and depth to text while maintaining focus.

FORMATTING REQUIREMENTS:
- Return content as properly formatted HTML
- Enhance formatting to improve readability (add headings, lists, emphasis where appropriate)
- Use semantic HTML to structure the expanded content logically
- Add formatting elements like <ul>/<ol> for new lists, <strong> for important points
- Maintain consistent formatting style with the original content`,

      shorten: `You are an expert at concise communication. Preserve all key information while reducing word count.

FORMATTING REQUIREMENTS:
- Return content as properly formatted HTML
- Preserve essential formatting elements (headings, key emphasis, important lists)
- Remove unnecessary formatting while maintaining readability
- Keep the most important structural elements`,

      summarize: `You are excellent at distilling key points into clear, concise summaries.

FORMATTING REQUIREMENTS:
- Return content as well-structured HTML
- Use <ul> or <ol> for key points when appropriate
- Structure with headings if the summary is complex
- Use <strong> for the most important concepts
- Create clean, scannable formatting`,

      tone: `You are an expert at adjusting writing tone while maintaining meaning and effectiveness.

FORMATTING REQUIREMENTS:
- Return content as properly formatted HTML
- Preserve all existing formatting structure
- Maintain the original formatting hierarchy and emphasis
- Adjust content while keeping formatting intact`,

      translate: `You are a professional translator who preserves style, tone, and cultural nuance.

CRITICAL FORMATTING REQUIREMENTS:
- Return content as properly formatted HTML
- Preserve all formatting elements from the original
- Maintain the same HTML structure and tags
- Ensure formatting conventions work well in the target language

⚠️ SPECIAL TABLE PRESERVATION RULES:
When translating content with tables:
- NEVER add whitespace, indentation, or line breaks to table HTML
- Keep table structure byte-for-byte identical except for translated text
- Preserve ALL table attributes exactly (style, min-width, colspan, rowspan)
- Keep colgroup and col elements exactly as they appear
- Do NOT beautify or reformat table HTML - keep it compressed if original is compressed

CRITICAL: If the original HTML contains tables, your output must have IDENTICAL table structure formatting.`,

      generate: `You are a creative and knowledgeable writer who produces high-quality, relevant content.

FORMATTING REQUIREMENTS:
- Return content as well-formatted HTML
- Use appropriate HTML structure: headings (<h1>-<h6>), paragraphs (<p>), lists (<ul>/<ol> with <li>)
- Apply emphasis with <strong> and <em> for important points
- Structure content logically with proper hierarchy
- Create professional, readable formatting`,

      custom: `You are a versatile editor who follows specific instructions precisely while maintaining text quality.

FORMATTING REQUIREMENTS:
- Return content as properly formatted HTML
- Enhance or preserve formatting as appropriate for the requested changes
- Use semantic HTML tags to structure the content
- Maintain professional, readable formatting throughout`,

      add_from_sources: `You are a research-focused editor who enhances text with relevant information from source documents. Use document tools to find and integrate supporting material.

CRITICAL FORMATTING PRESERVATION RULES:
- You MUST return HTML with IDENTICAL structure to the original
- PRESERVE every single HTML tag and formatting element
- When adding content, use the EXACT same HTML tags and structure
- DO NOT modify spacing, indentation, or existing formatting
- ADD information seamlessly using matching HTML patterns
- Return ONLY the enhanced portion with ZERO structural changes

When enhancing text with source information:
1. Identify the exact HTML structure of the original content
2. Add information using identical HTML tags and formatting
3. Maintain perfect structural consistency
4. Ensure the result has no formatting differences from the original style`,

      verify_against_sources: `You are a fact-checker who verifies information against source documents. Use document tools to check accuracy and correct any errors.

CRITICAL FORMATTING PRESERVATION RULES:
- You MUST return HTML with IDENTICAL structure to the original
- PRESERVE every HTML tag, attribute, and formatting element exactly
- ONLY correct factual content - NEVER change any formatting
- DO NOT modify tags, spacing, or structure in any way
- Return content with ZERO visual or structural differences

When verifying information:
1. Keep every HTML tag and structure element identical
2. Only change factual content, never formatting
3. Maintain exact visual presentation
4. Ensure formatting is 100% preserved`,

      expand_with_sources: `You are a content developer who expands text using specific information from source documents. Use document tools to find relevant details.

CRITICAL FORMATTING PRESERVATION RULES:
- You MUST return HTML that has the IDENTICAL structure to the original
- PRESERVE every HTML tag, attribute, and formatting element exactly
- If original has <ul> with <li><strong>, maintain that EXACT pattern for new items
- DO NOT change spacing, indentation, or tag structure
- ADD content using the EXACT same HTML pattern as existing content
- Return ONLY the expanded portion with ZERO formatting changes

FORMATTING EXAMPLE:
Original: <ul><li><strong>Item</strong> (description)</li></ul>
Expansion: <ul><li><strong>Item</strong> (description)</li><li><strong>New Item</strong> (new description)</li></ul>

When expanding content:
1. Identify the exact HTML pattern used in the original
2. Add new content using the identical pattern
3. Preserve all tags, spacing, and structure precisely
4. Return content that looks like it was written as one piece originally`,

      cite_sources: `You are an academic editor who adds proper citations and references. Use document tools to identify and reference source materials.

CRITICAL FORMATTING PRESERVATION RULES:
- You MUST return HTML with IDENTICAL structure to the original
- PRESERVE every HTML tag and formatting element exactly
- ADD citations without changing any existing formatting
- Use minimal, unobtrusive citation formats
- Return content with ZERO structural modifications

When adding citations:
1. Keep original HTML structure completely unchanged
2. Add citations using simple formats like superscript numbers
3. Maintain identical visual presentation for all existing content
4. Ensure citations don't disrupt formatting flow`,
    }

    let systemPrompt = basePrompts[actionType] || basePrompts.improve

    // Add document context for document-aware actions
    if (this.needsDocumentTools(action) && documentContext) {
      const contextAddition = `\n\nDocument Context:
${documentContext.sessionId ? `- Session ID: ${documentContext.sessionId}` : ""}
${documentContext.documentIds ? `- Available Documents: ${documentContext.documentIds.length} documents` : ""}
${documentContext.currentDocumentTitle ? `- Current Document: ${documentContext.currentDocumentTitle}` : ""}

Use the available document tools (searchDocuments, getDocument, getMultipleDocuments) to access source material. Always ground your enhancements in the actual content from these documents.`

      systemPrompt += contextAddition
    }

    return systemPrompt
  }

  /**
   * Select the best model for each action type
   */
  private selectModelForAction(action: string): ModelId {
    const actionType = action.split(":")[0]

    const modelMap: Record<string, ModelId> = {
      improve: "claude-4-sonnet", // Excellent for writing improvement
      fix: "gpt-4.1", // Great for precise corrections
      simplify: "claude-4-sonnet", // Good at clear communication
      expand: "claude-4-sonnet", // Creative expansion
      shorten: "gpt-4.1", // Precise condensation
      summarize: "gpt-4.1", // Excellent at summarization
      tone: "claude-4-sonnet", // Great at style adjustments
      translate: "gpt-4.1", // Strong multilingual capabilities
      generate: "claude-4-sonnet", // Creative content generation
      custom: "claude-4-sonnet", // Versatile for custom instructions
      add_from_sources: "claude-4-sonnet",
      verify_against_sources: "claude-4-sonnet",
      expand_with_sources: "claude-4-sonnet",
      cite_sources: "claude-4-sonnet",
    }

    return modelMap[actionType] || "claude-4-sonnet"
  }

  /**
   * Get appropriate temperature for each action
   */
  private getTemperatureForAction(action: string): number {
    const actionType = action.split(":")[0]

    const temperatureMap: Record<string, number> = {
      improve: 0.7, // Balanced creativity and consistency
      fix: 0.1, // Very low for precise corrections
      simplify: 0.3, // Low for clear, straightforward language
      expand: 0.8, // Higher for creative expansion
      shorten: 0.2, // Low for precise condensation
      summarize: 0.3, // Low for accurate summarization
      tone: 0.6, // Moderate for style changes
      translate: 0.2, // Low for accurate translation
      generate: 0.8, // High for creative generation
      custom: 0.5, // Moderate default
      add_from_sources: 0.7,
      verify_against_sources: 0.7,
      expand_with_sources: 0.8,
      cite_sources: 0.7,
    }

    return temperatureMap[actionType] || 0.7
  }

  /**
   * Check if content fits within our 100k token input limit
   */
  private canFitInInputLimit(text: string): boolean {
    const tokens = this.estimateTokens(text)
    return tokens <= this.maxInputTokens
  }

  /**
   * Estimate token count for content (rough: 4 characters per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
}

export const aiEditorService = new AIEditorService()
