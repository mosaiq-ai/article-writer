"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, CheckCircle } from "lucide-react"
import { SelectionInfo } from "@/lib/editor/ai-editor-service"
import { useDocumentSession } from "@/contexts/DocumentSessionContext"

interface AIEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: string
  selection: SelectionInfo | null
  result: string | null
  isLoading: boolean
  sourcesUsed?: string[]
  onApply: (text: string) => void
  onRegenerate: (customPrompt?: string, selectedSources?: string[]) => void
}

export function AIEditDialog({
  open,
  onOpenChange,
  action,
  selection,
  result,
  isLoading,
  sourcesUsed = [],
  onApply,
  onRegenerate,
}: AIEditDialogProps) {
  const [instruction, setInstruction] = useState("")
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [documentTitles, setDocumentTitles] = useState<Record<string, string>>({})
  const { getSessionDocuments, getDocumentTitles } = useDocumentSession()

  // Reset local state when dialog opens with a new action
  useEffect(() => {
    if (open) {
      setInstruction("")
      setSelectedSources([])

      // Fetch document titles when dialog opens
      getDocumentTitles()
        .then((titles) => {
          setDocumentTitles(titles)
        })
        .catch((error) => {
          console.error("Failed to fetch document titles:", error)
          setDocumentTitles({})
        })
    }
  }, [open, action, getDocumentTitles])

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      improve: "Improve Text",
      fix: "Fix Grammar",
      simplify: "Simplify",
      expand: "Expand",
      shorten: "Make Concise",
      summarize: "Summarize",
      custom: "Custom Edit",
      add_from_sources: "Add from Sources",
      verify_against_sources: "Verify with Sources",
      expand_with_sources: "Expand with Sources",
      cite_sources: "Add Citations",
      "tone:professional": "Professional Tone",
      "tone:casual": "Casual Tone",
      "tone:formal": "Formal Tone",
      "tone:friendly": "Friendly Tone",
      "tone:confident": "Confident Tone",
      "tone:diplomatic": "Diplomatic Tone",
    }
    return labels[action] || action
  }

  const isDocumentAwareAction = (action: string): boolean => {
    return [
      "add_from_sources",
      "verify_against_sources",
      "expand_with_sources",
      "cite_sources",
    ].includes(action.split(":")[0])
  }

  const needsCustomInstructions = (): boolean => {
    return action === "custom" || isDocumentAwareAction(action)
  }

  const getInstructionPlaceholder = (): string => {
    if (action === "custom") {
      return "Describe what you want to do with the selected text..."
    }

    const placeholders: Record<string, string> = {
      add_from_sources:
        "e.g., Add technical specifications, focus on financial data, include recent statistics...",
      verify_against_sources:
        "e.g., Check the dates mentioned, verify the statistics, confirm the methodology...",
      expand_with_sources:
        "e.g., Add more examples, include supporting evidence, elaborate on the technical details...",
      cite_sources: "e.g., Use APA format, focus on peer-reviewed sources, include page numbers...",
    }

    return placeholders[action] || "Provide specific instructions for this action..."
  }

  const availableSources = getSessionDocuments()

  const generateAIEdit = async () => {
    const customPrompt = instruction.trim() || undefined
    const sources =
      isDocumentAwareAction(action) && selectedSources.length > 0 ? selectedSources : undefined

    await onRegenerate(customPrompt, sources)
  }

  const applyEdit = () => {
    onApply(result || "")
  }

  const handleSourceToggle = (documentId: string, checked: boolean) => {
    if (checked) {
      setSelectedSources((prev) => [...prev, documentId])
    } else {
      setSelectedSources((prev) => prev.filter((id) => id !== documentId))
    }
  }

  const selectAllSources = () => {
    setSelectedSources(availableSources)
  }

  const clearSourceSelection = () => {
    setSelectedSources([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDocumentAwareAction(action) && <FileText className="h-5 w-5 text-blue-600" />}
            {getActionLabel(action)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {needsCustomInstructions() && !result ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="instruction">
                  {action === "custom"
                    ? "Custom Instruction"
                    : "Additional Instructions (Optional)"}
                </Label>
                <Textarea
                  id="instruction"
                  placeholder={getInstructionPlaceholder()}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>

              {/* Source Selection for Document-Aware Actions */}
              {isDocumentAwareAction(action) && availableSources.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Select Source Documents</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={selectAllSources}>
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearSourceSelection}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-3 space-y-2">
                    {availableSources.map((docId) => (
                      <div key={docId} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={docId}
                          checked={selectedSources.includes(docId)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleSourceToggle(docId, e.target.checked)
                          }
                          className="h-4 w-4 rounded border border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <label
                          htmlFor={docId}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {documentTitles[docId] || docId}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedSources.length === 0
                      ? "Select specific documents or leave empty to search all sources"
                      : `${selectedSources.length} document${selectedSources.length > 1 ? "s" : ""} selected`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Tabs defaultValue="result" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="result">Result</TabsTrigger>
                <TabsTrigger value="diff">Compare</TabsTrigger>
                {sourcesUsed.length > 0 && <TabsTrigger value="sources">Sources Used</TabsTrigger>}
              </TabsList>

              <div className="flex-1 overflow-auto mt-4">
                <TabsContent value="result" className="space-y-4 h-full">
                  <div className="flex items-center gap-2">
                    <Label>AI Generated Result</Label>
                    {isDocumentAwareAction(action) && sourcesUsed.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {sourcesUsed.length} source{sourcesUsed.length > 1 ? "s" : ""} used
                      </Badge>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">
                        {isDocumentAwareAction(action)
                          ? "Analyzing source documents..."
                          : "Generating..."}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1 p-3 bg-green-50 dark:bg-green-950 rounded-md text-sm max-h-64 overflow-auto">
                      {result || "No result yet..."}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="diff" className="space-y-4">
                  <div>
                    <Label>Original</Label>
                    <div className="mt-1 p-3 bg-red-50 dark:bg-red-950 rounded-md text-sm max-h-32 overflow-auto">
                      {selection?.text}
                    </div>
                  </div>
                  <div>
                    <Label>Edited</Label>
                    <div className="mt-1 p-3 bg-green-50 dark:bg-green-950 rounded-md text-sm max-h-32 overflow-auto">
                      {result || "..."}
                    </div>
                  </div>
                </TabsContent>

                {sourcesUsed.length > 0 && (
                  <TabsContent value="sources" className="space-y-4">
                    <div>
                      <Label>Source Documents Referenced</Label>
                      <div className="mt-2 space-y-2">
                        {sourcesUsed.map((sourceId, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md"
                          >
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">
                              {documentTitles[sourceId] || sourceId}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        The AI used information from these source documents to enhance your text.
                      </p>
                    </div>
                  </TabsContent>
                )}
              </div>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {needsCustomInstructions() && !result ? (
            <Button
              onClick={generateAIEdit}
              disabled={(action === "custom" && !instruction) || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={generateAIEdit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Regenerate
              </Button>
              <Button onClick={applyEdit} disabled={!result || isLoading}>
                Apply Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
