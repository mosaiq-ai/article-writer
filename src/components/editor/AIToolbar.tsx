"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Sparkles, Wand2, Brain, FileSearch, Loader2 } from "lucide-react"
import { useState } from "react"
import { Editor } from "@tiptap/react"
import { useToast } from "@/components/ui/use-toast"

interface AIToolbarProps {
  editor: Editor
  onSearchDocuments?: () => void
  onGenerateContent?: () => void
}

export function AIToolbar({ editor, onSearchDocuments, onGenerateContent }: AIToolbarProps) {
  const [open, setOpen] = useState(false)
  const [showAskDialog, setShowAskDialog] = useState(false)
  const [askPrompt, setAskPrompt] = useState("")
  const [isAsking, setIsAsking] = useState(false)
  const { toast } = useToast()

  const handleAskAI = async () => {
    if (!askPrompt.trim()) return

    setIsAsking(true)
    try {
      // Get current document content for context
      const content = editor.getText()
      const contextSnippet = content.slice(0, 1000) // First 1000 chars for context

      // Call the API route instead of the service directly
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Question: ${askPrompt}\n\nPlease provide a helpful answer that could assist with writing or editing.`,
          context: contextSnippet ? `Current document content: ${contextSnippet}` : undefined,
          style: "helpful and informative",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get AI response")
      }

      const data = await response.json()

      // Show result in a toast or insert at cursor
      toast({
        title: "AI Assistant",
        description: data.result.text.slice(0, 200) + (data.result.text.length > 200 ? "..." : ""),
      })

      // Optionally also insert at cursor
      editor.chain().focus().insertContent(`\n\n**AI Assistant:** ${data.result.text}\n\n`).run()

      setShowAskDialog(false)
      setAskPrompt("")
    } catch (error) {
      console.error("Ask AI error:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to get AI response. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAsking(false)
    }
  }

  const aiActions = [
    {
      id: "generate",
      label: "Generate Content",
      description: "Create new content using AI agents",
      icon: Wand2,
      action: () => {
        setOpen(false)
        onGenerateContent?.()
      },
    },
    {
      id: "search",
      label: "Search Documents",
      description: "Find and reference other documents",
      icon: FileSearch,
      action: () => {
        setOpen(false)
        onSearchDocuments?.()
      },
    },
    {
      id: "ask",
      label: "Ask AI Assistant",
      description: "Get help with writing",
      icon: Brain,
      action: () => {
        setOpen(false)
        setShowAskDialog(true)
      },
    },
  ]

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Tools
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-medium leading-none mb-3">AI Writing Tools</h4>
            {aiActions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                className="flex items-start gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <action.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Ask AI Dialog */}
      <Dialog open={showAskDialog} onOpenChange={setShowAskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Ask AI Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ask-prompt">What would you like to know?</Label>
              <Textarea
                id="ask-prompt"
                placeholder="E.g., How can I make this more persuasive? What's a good way to conclude this section?"
                value={askPrompt}
                onChange={(e) => setAskPrompt(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAskDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAskAI} disabled={!askPrompt.trim() || isAsking}>
                {isAsking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ask AI
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
