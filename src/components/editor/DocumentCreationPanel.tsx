"use client"

import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { useDocumentSession } from "@/contexts/DocumentSessionContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  Wand2,
  X,
  ChevronRight,
  Loader2,
  CheckCircle,
  FileIcon,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentCreationPanelProps {
  onClose: () => void
  onFlowStart?: (flowId: string) => void
  className?: string
}

interface CreationData {
  goal: string
  description: string
  sources: File[]
  processedDocumentIds: string[]
  style: string
  length: string
  audience: string
  preferredModel: string
}

export function DocumentCreationPanel({
  onClose,
  onFlowStart,
  className,
}: DocumentCreationPanelProps) {
  const { sessionId, createNewSession, addDocumentToCurrentSession } = useDocumentSession()
  const [activeTab, setActiveTab] = useState("goal")
  const [isProcessing, setIsProcessing] = useState(false)
  const [creationData, setCreationData] = useState<CreationData>({
    goal: "",
    description: "",
    sources: [],
    processedDocumentIds: [],
    style: "professional",
    length: "medium",
    audience: "general",
    preferredModel: "gpt-4.1",
  })

  // Create session on mount if none exists
  useState(() => {
    if (!sessionId) {
      createNewSession({ purpose: "document-creation" }).catch(console.error)
    }
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles: File[]) => {
      setIsProcessing(true)

      // Ensure we have a session
      let currentSessionId = sessionId
      if (!currentSessionId) {
        const session = await createNewSession({ purpose: "document-creation" })
        currentSessionId = session.id
      }

      try {
        const processedIds: string[] = []
        const successfulFiles: File[] = []

        for (const file of acceptedFiles) {
          console.log(`🔄 Uploading file: ${file.name}`)

          try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("sessionId", currentSessionId)

            const response = await fetch("/api/documents/upload", {
              method: "POST",
              body: formData,
            })

            if (!response.ok) {
              throw new Error(`Upload failed: ${response.statusText}`)
            }

            const result = await response.json()
            if (result.success) {
              processedIds.push(result.document.id)
              successfulFiles.push(file)

              // Add to session
              await addDocumentToCurrentSession(result.document.id)

              console.log(`✅ Successfully uploaded: ${file.name}`)
            }
          } catch (error) {
            console.error(`❌ Failed to process ${file.name}:`, error)
          }
        }

        setCreationData((prev) => ({
          ...prev,
          sources: [...prev.sources, ...successfulFiles],
          processedDocumentIds: [...prev.processedDocumentIds, ...processedIds],
        }))
      } catch (error) {
        console.error("Document processing error:", error)
      } finally {
        setIsProcessing(false)
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
  })

  const removeDocument = (index: number) => {
    setCreationData((prev) => ({
      ...prev,
      sources: prev.sources.filter((_, i) => i !== index),
      processedDocumentIds: prev.processedDocumentIds.filter((_, i) => i !== index),
    }))
  }

  const canProceed = (): boolean => {
    switch (activeTab) {
      case "goal":
        return creationData.goal.length > 10
      case "sources":
        return creationData.processedDocumentIds.length > 0
      case "settings":
        return true
      default:
        return false
    }
  }

  const handleCreate = async () => {
    setIsProcessing(true)
    try {
      if (!sessionId) {
        throw new Error("No active session")
      }

      const context = {
        goal: creationData.goal,
        documentIds: creationData.processedDocumentIds,
        sessionId, // Include session ID
        style: creationData.style,
        preferredModel: creationData.preferredModel || "gpt-4.1",
        constraints: [
          `Target length: ${creationData.length}`,
          `Audience: ${creationData.audience}`,
          ...(creationData.description ? [`Additional context: ${creationData.description}`] : []),
        ],
      }

      console.log("🚀 Starting agent flow with context:", context)

      const response = await fetch("/api/agents/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      })

      if (!response.ok) {
        throw new Error(`Failed to start agent flow: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success || !result.flowId) {
        throw new Error("Invalid response from agent flow API")
      }

      console.log("🎯 Agent flow started with ID:", result.flowId)

      if (onFlowStart) {
        onFlowStart(result.flowId)
      }

      // Close panel after starting
      onClose()
    } catch (error) {
      console.error("❌ Document creation error:", error)
      alert(
        `Failed to create document: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Create New Document</h2>
        <Button variant="ghost" size="icon" onClick={onClose} disabled={isProcessing}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="goal">Goal</TabsTrigger>
          <TabsTrigger value="sources" disabled={!canProceed() && activeTab === "goal"}>
            Sources
          </TabsTrigger>
          <TabsTrigger value="settings" disabled={creationData.processedDocumentIds.length === 0}>
            Settings
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-4">
          <TabsContent value="goal" className="space-y-4 pb-4">
            <div>
              <Label htmlFor="goal">Document Goal</Label>
              <Input
                id="goal"
                placeholder="e.g., Create a comprehensive guide on machine learning"
                value={creationData.goal}
                onChange={(e) => setCreationData((prev) => ({ ...prev, goal: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Describe what you want to create</p>
            </div>

            <div>
              <Label htmlFor="description">Additional Context (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide any additional context or specific requirements..."
                value={creationData.description}
                onChange={(e) =>
                  setCreationData((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-1"
                rows={4}
              />
            </div>

            {creationData.goal.length > 0 && creationData.goal.length <= 10 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Please provide a more detailed goal</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sources" className="space-y-4 pb-4">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? "Drop the files here..."
                  : "Drag & drop files here, or click to select"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports PDF, Word, TXT, and Markdown files
              </p>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Processing documents...</span>
              </div>
            )}

            <div className="space-y-2">
              {creationData.sources.map((file, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      {index < creationData.processedDocumentIds.length && (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDocument(index)}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {creationData.sources.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Upload at least one document to use as source material
              </p>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 pb-4">
            <div>
              <Label htmlFor="style">Writing Style</Label>
              <Select
                value={creationData.style}
                onValueChange={(value) => setCreationData((prev) => ({ ...prev, style: value }))}
              >
                <SelectTrigger id="style" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="length">Document Length</Label>
              <Select
                value={creationData.length}
                onValueChange={(value) => setCreationData((prev) => ({ ...prev, length: value }))}
              >
                <SelectTrigger id="length" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (1-3 pages)</SelectItem>
                  <SelectItem value="medium">Medium (4-10 pages)</SelectItem>
                  <SelectItem value="long">Long (10+ pages)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="audience">Target Audience</Label>
              <Select
                value={creationData.audience}
                onValueChange={(value) => setCreationData((prev) => ({ ...prev, audience: value }))}
              >
                <SelectTrigger id="audience" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="model">Preferred AI Model</Label>
              <Select
                value={creationData.preferredModel}
                onValueChange={(value) =>
                  setCreationData((prev) => ({ ...prev, preferredModel: value }))
                }
              >
                <SelectTrigger id="model" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4.1">GPT-4.1 (Best for analysis)</SelectItem>
                  <SelectItem value="claude-4-sonnet">
                    Claude 4 Sonnet (Best for writing)
                  </SelectItem>
                  <SelectItem value="gemini-2.5-pro">
                    Gemini 2.5 Pro (Best for long context)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            {activeTab !== "settings" && (
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ["goal", "sources", "settings"]
                  const currentIndex = tabs.indexOf(activeTab)
                  if (currentIndex < tabs.length - 1 && canProceed()) {
                    setActiveTab(tabs[currentIndex + 1])
                  }
                }}
                disabled={!canProceed() || isProcessing}
                className="flex-1"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {activeTab === "settings" && (
              <Button
                onClick={handleCreate}
                disabled={creationData.processedDocumentIds.length === 0 || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Create Document
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Tabs>
    </Card>
  )
}
