"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Upload,
  Wand2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { useDropzone } from "react-dropzone"

interface DocumentCreationWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFlowStart?: (flowId: string) => void
}

type WizardStep = "goal" | "sources" | "settings" | "review"

interface WizardData {
  goal: string
  description: string
  sources: File[]
  processedDocumentIds: string[]
  style: string
  length: string
  audience: string
  preferredModel: string
}

export function DocumentCreationWizard({
  open,
  onOpenChange,
  onFlowStart,
}: DocumentCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("goal")
  const [isProcessing, setIsProcessing] = useState(false)
  const [wizardData, setWizardData] = useState<WizardData>({
    goal: "",
    description: "",
    sources: [],
    processedDocumentIds: [],
    style: "professional",
    length: "medium",
    audience: "general",
    preferredModel: "claude-4-sonnet",
  })

  const steps: { id: WizardStep; title: string; description: string }[] = [
    {
      id: "goal",
      title: "Document Goal",
      description: "What do you want to create?",
    },
    {
      id: "sources",
      title: "Source Documents",
      description: "Upload reference materials",
    },
    {
      id: "settings",
      title: "Document Settings",
      description: "Customize style and format",
    },
    {
      id: "review",
      title: "Review & Create",
      description: "Confirm your settings",
    },
  ]

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles: File[]) => {
      setIsProcessing(true)
      try {
        const processedIds: string[] = []
        const successfulFiles: File[] = []
        const failedFiles: string[] = []

        for (const file of acceptedFiles) {
          console.log(`🔄 Uploading file: ${file.name}`)

          try {
            // Create form data for file upload
            const formData = new FormData()
            formData.append("file", file)

            // Upload and process the file
            const response = await fetch("/api/documents/upload", {
              method: "POST",
              body: formData,
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const result = await response.json()
            if (result.success) {
              processedIds.push(result.document.id)
              successfulFiles.push(file)
              console.log(`✅ Successfully uploaded: ${file.name} -> ${result.document.id}`)
            } else {
              throw new Error(result.error || "Unknown processing error")
            }
          } catch (fileError) {
            console.error(`❌ Failed to process ${file.name}:`, fileError)
            failedFiles.push(file.name)
          }
        }

        // Update state with successful uploads
        if (successfulFiles.length > 0) {
          setWizardData((prev) => ({
            ...prev,
            sources: [...prev.sources, ...successfulFiles],
            processedDocumentIds: [...prev.processedDocumentIds, ...processedIds],
          }))
        }

        // Show user feedback
        if (failedFiles.length > 0 && successfulFiles.length > 0) {
          alert(
            `Partially successful: ${successfulFiles.length} files uploaded successfully, but ${failedFiles.length} files failed: ${failedFiles.join(", ")}`
          )
        } else if (failedFiles.length > 0) {
          alert(
            `Upload failed for all files: ${failedFiles.join(", ")}. Please check that the Python PDF service is running and try again.`
          )
        } else {
          console.log(`✅ All ${successfulFiles.length} files uploaded successfully`)
        }
      } catch (error) {
        console.error("Document processing error:", error)
        alert(
          `Failed to process documents: ${error instanceof Error ? error.message : "Unknown error"}. Please ensure the Python PDF service is running.`
        )
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

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "goal":
        return wizardData.goal.length > 10
      case "sources":
        return wizardData.processedDocumentIds.length > 0
      case "settings":
        return true
      case "review":
        return wizardData.processedDocumentIds.length > 0
      default:
        return false
    }
  }

  const handleNext = () => {
    const stepOrder: WizardStep[] = ["goal", "sources", "settings", "review"]
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const stepOrder: WizardStep[] = ["goal", "sources", "settings", "review"]
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }

  const handleCreate = async () => {
    setIsProcessing(true)
    try {
      // Ensure we have documents to work with
      if (wizardData.processedDocumentIds.length === 0) {
        throw new Error(
          "No documents have been uploaded and processed. Please upload at least one document."
        )
      }

      // Use the actual agent flow API from Phase 2
      const context = {
        goal: wizardData.goal,
        documentIds: wizardData.processedDocumentIds,
        style: wizardData.style,
        preferredModel: wizardData.preferredModel || "gpt-4o",
        constraints: [
          `Target length: ${wizardData.length}`,
          `Audience: ${wizardData.audience}`,
          ...(wizardData.description ? [`Additional context: ${wizardData.description}`] : []),
        ],
      }

      console.log("🚀 Starting agent flow with context:", context)

      // Call the actual agent flow API
      const response = await fetch("/api/agents/flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(context),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to start agent flow: ${response.status} ${errorData}`)
      }

      const flowResult = await response.json()
      console.log("🎯 Agent flow started:", flowResult)

      // Generate a unique flow ID for monitoring
      const flowId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Close the wizard and start monitoring
      onOpenChange(false)

      // Pass the flow ID to the parent for monitoring
      if (onFlowStart) {
        onFlowStart(flowId)
      }

      // Store the flow result for later retrieval
      sessionStorage.setItem(`flow_${flowId}`, JSON.stringify(flowResult))
    } catch (error) {
      console.error("❌ Document creation error:", error)
      alert(
        `Failed to create document: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "goal":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="goal">Document Goal</Label>
              <Input
                id="goal"
                placeholder="e.g., Create a comprehensive guide on machine learning"
                value={wizardData.goal}
                onChange={(e) => setWizardData((prev) => ({ ...prev, goal: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Additional Context (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide any additional context or specific requirements..."
                value={wizardData.description}
                onChange={(e) =>
                  setWizardData((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
        )

      case "sources":
        return (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
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

            {wizardData.sources.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files ({wizardData.processedDocumentIds.length} processed)</Label>
                {wizardData.sources.map((file, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                        {index < wizardData.processedDocumentIds.length && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setWizardData((prev) => ({
                            ...prev,
                            sources: prev.sources.filter((_, i) => i !== index),
                            processedDocumentIds: prev.processedDocumentIds.filter(
                              (_, i) => i !== index
                            ),
                          }))
                        }}
                        disabled={isProcessing}
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {wizardData.sources.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Please upload at least one document to proceed. The AI will use these documents as
                  source material for creating your new document.
                </p>
              </div>
            )}

            {wizardData.sources.length > 0 && wizardData.processedDocumentIds.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-orange-600">
                  Documents are still being processed. Please wait for processing to complete before
                  proceeding.
                </p>
              </div>
            )}
          </div>
        )

      case "settings":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="style">Writing Style</Label>
              <Select
                value={wizardData.style}
                onValueChange={(value) => setWizardData((prev) => ({ ...prev, style: value }))}
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
                value={wizardData.length}
                onValueChange={(value) => setWizardData((prev) => ({ ...prev, length: value }))}
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
                value={wizardData.audience}
                onValueChange={(value) => setWizardData((prev) => ({ ...prev, audience: value }))}
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
                value={wizardData.preferredModel}
                onValueChange={(value) =>
                  setWizardData((prev) => ({ ...prev, preferredModel: value }))
                }
              >
                <SelectTrigger id="model" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-4-sonnet">
                    Claude 4 Sonnet (Best for writing)
                  </SelectItem>
                  <SelectItem value="gpt-4.1">GPT-4.1 (Best for analysis)</SelectItem>
                  <SelectItem value="gemini-2.5-pro">
                    Gemini 2.5 Pro (Best for long context)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "review":
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Goal</Label>
                <p className="text-sm mt-1">{wizardData.goal}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Source Documents</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {wizardData.sources.length > 0 ? (
                    wizardData.sources.map((file, index) => (
                      <Badge key={index} variant="secondary">
                        {file.name}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">Using test documents</Badge>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Settings</Label>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">{wizardData.style}</Badge>
                  <Badge variant="outline">{wizardData.length}</Badge>
                  <Badge variant="outline">{wizardData.audience}</Badge>
                  <Badge variant="outline">{wizardData.preferredModel}</Badge>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                The AI will analyze your source documents and create a new document based on your
                specifications. This process typically takes 1-3 minutes and will use the full
                content of your documents for accurate, grounded writing.
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Document with AI</DialogTitle>
          <DialogDescription>{steps[currentStepIndex].description}</DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={((currentStepIndex + 1) / steps.length) * 100} />
          <div className="flex justify-between text-xs text-muted-foreground">
            {steps.map((step, index) => (
              <span key={step.id} className={index <= currentStepIndex ? "text-foreground" : ""}>
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] py-4">{renderStepContent()}</div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isProcessing}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep === "review" ? (
            <Button onClick={handleCreate} disabled={!canProceed() || isProcessing}>
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
          ) : (
            <Button onClick={handleNext} disabled={!canProceed() || isProcessing}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
