"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sparkles, Wand2, Brain, FileSearch } from "lucide-react"
import { useState } from "react"

interface AIToolbarProps {
  onGenerateContent?: () => void
  onSearchDocuments?: () => void
  onAskAI?: () => void
}

export function AIToolbar({ onGenerateContent, onSearchDocuments, onAskAI }: AIToolbarProps) {
  const [open, setOpen] = useState(false)

  const aiActions = [
    {
      id: "generate",
      label: "Generate Content",
      description: "Create new content with AI",
      icon: Wand2,
      action: onGenerateContent || (() => console.log("Generate content")),
    },
    {
      id: "search",
      label: "Search Documents",
      description: "Find and reference other documents",
      icon: FileSearch,
      action: onSearchDocuments || (() => console.log("Search documents")),
    },
    {
      id: "ask",
      label: "Ask AI Assistant",
      description: "Get help with writing",
      icon: Brain,
      action: onAskAI || (() => console.log("Ask AI")),
    },
  ]

  return (
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
              onClick={() => {
                action.action()
                setOpen(false)
              }}
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
  )
}
