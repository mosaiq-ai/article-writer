"use client"

import { useState, useEffect } from "react"
import { Editor } from "@tiptap/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Sparkles, Copy, Check } from "lucide-react"
import { AISelectionHandler } from "@/lib/editor/ai-selection"
import { useToast } from "@/components/ui/use-toast"

interface Selection {
  text: string
  from: number
  to: number
  isEmpty?: boolean
  context?: {
    before: string
    after: string
  }
}

interface AIEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor
  selection: Selection | null
  action: string
}

export function AIEditDialog({ open, onOpenChange, editor, selection, action }: AIEditDialogProps) {
  const [customPrompt, setCustomPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState("")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const aiHandler = new AISelectionHandler(editor)

  const generateAIEdit = async () => {
    if (!selection || selection.isEmpty) return

    setIsLoading(true)
    try {
      buildPrompt(action, customPrompt, selection)

      // For now, simulate AI response - in real implementation, this would call the AI service
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock AI response based on action
      const mockResponse = generateMockResponse(action, selection.text)
      setResult(mockResponse)
    } catch (err) {
      console.error("AI edit error:", err)
      toast({
        title: "Error",
        description: "Failed to generate AI edit. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && action) {
      generateAIEdit()
    }
  }, [open, action])

  const generateMockResponse = (action: string, text: string): string => {
    switch (action) {
      case "improve":
        return text.replace(/\b\w+/g, (word) => (word.length > 3 ? word + " (enhanced)" : word))
      case "fix":
        return text.replace(/\bi\b/g, "I").replace(/\bdont\b/g, "don't")
      case "simplify":
        return text.replace(/\b\w{8,}\b/g, "simple")
      case "expand":
        return text + " This is an expanded version with additional context and details."
      case "shorten":
        return text
          .split(" ")
          .slice(0, Math.ceil(text.split(" ").length / 2))
          .join(" ")
      case "summarize":
        return "Summary: " + text.split(" ").slice(0, 10).join(" ") + "..."
      default:
        if (action.startsWith("tone:")) {
          const tone = action.split(":")[1]
          return `[${tone.toUpperCase()} TONE] ${text}`
        }
        if (action.startsWith("translate:")) {
          const language = action.split(":")[1]
          return `[TRANSLATED TO ${language.toUpperCase()}] ${text}`
        }
        return text
    }
  }

  const buildPrompt = (action: string, customInstruction: string, selection: Selection): string => {
    const basePrompt = `Edit the following text according to the instruction.

Original text: "${selection.text}"

Context before: "${selection.context?.before}"
Context after: "${selection.context?.after}"

`

    const actionPrompts: Record<string, string> = {
      improve:
        "Improve the writing quality, clarity, and flow while maintaining the original meaning.",
      fix: "Fix all grammar, spelling, and punctuation errors.",
      simplify: "Simplify the language to make it easier to understand.",
      expand:
        "Expand this text with more detail and explanation while keeping the same key points.",
      shorten: "Make this text more concise while preserving the essential information.",
      summarize: "Summarize the key points in a brief, clear manner.",
    }

    if (action.startsWith("tone:")) {
      const tone = action.split(":")[1]
      return basePrompt + `Change the tone to be more ${tone}.`
    }

    if (action.startsWith("translate:")) {
      const language = action.split(":")[1]
      return basePrompt + `Translate to ${language}.`
    }

    if (action === "custom") {
      return basePrompt + `Instruction: ${customInstruction}`
    }

    return basePrompt + (actionPrompts[action] || "Improve the text.")
  }

  const applyEdit = () => {
    if (result) {
      aiHandler.replaceSelection(result)
      onOpenChange(false)
      toast({
        title: "Applied",
        description: "AI edit has been applied to your document.",
      })
    }
  }

  const copyResult = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const regenerate = () => {
    generateAIEdit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Text Editor
          </DialogTitle>
          <DialogDescription>
            {action === "custom"
              ? "Provide instructions for how you want to edit the selected text."
              : `AI will ${action.replace(":", " to ")} your selected text.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Text */}
          <div>
            <Label>Selected Text</Label>
            <div className="mt-1 p-3 bg-muted rounded-md text-sm">
              {selection?.text || "No text selected"}
            </div>
          </div>

          {/* Custom Instruction Input */}
          {action === "custom" && (
            <div>
              <Label htmlFor="instruction">Instructions</Label>
              <Textarea
                id="instruction"
                placeholder="E.g., Make this more persuasive, add examples, change to past tense..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          {/* Results */}
          {(result || isLoading) && (
            <Tabs defaultValue="result" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="result">Result</TabsTrigger>
                <TabsTrigger value="diff">Compare</TabsTrigger>
              </TabsList>

              <TabsContent value="result" className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>AI Edit</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={copyResult} disabled={!result}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={regenerate} disabled={isLoading}>
                      Regenerate
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-md min-h-[100px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{result}</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="diff" className="space-y-4">
                <div>
                  <Label>Original</Label>
                  <div className="mt-1 p-3 bg-red-50 dark:bg-red-950 rounded-md text-sm">
                    {selection?.text}
                  </div>
                </div>
                <div>
                  <Label>Edited</Label>
                  <div className="mt-1 p-3 bg-green-50 dark:bg-green-950 rounded-md text-sm">
                    {result || "..."}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {action === "custom" && !result ? (
            <Button onClick={generateAIEdit} disabled={!customPrompt || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          ) : (
            <Button onClick={applyEdit} disabled={!result || isLoading}>
              Apply Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
