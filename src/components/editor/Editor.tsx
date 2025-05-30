"use client"

import {
  useEditor,
  EditorContent,
  BubbleMenu,
  FloatingMenu,
  Editor as TiptapEditor,
  Extension,
} from "@tiptap/react"
import { useEffect, useState } from "react"
import { defaultEditorConfig } from "@/lib/editor/config"
import { EditorToolbar } from "./EditorToolbar"
import { EditorBubbleMenu } from "./EditorBubbleMenu"
import { EditorFloatingMenu } from "./EditorFloatingMenu"
import { EditorStats } from "./EditorStats"
import { AIContextMenu } from "./AIContextMenu"
import { DocumentSearch } from "./DocumentSearch"
import { DocumentCreationPanel } from "./DocumentCreationPanel"
import { AgentProgressDashboard } from "./AgentProgressDashboard"
import { cn } from "@/lib/utils"
import { DocumentSessionProvider } from "@/contexts/DocumentSessionContext"
import "./tiptap-editor.css"

interface EditorProps {
  content?: string
  onChange?: (content: string) => void
  onSave?: (content: string) => Promise<void>
  className?: string
  editable?: boolean
}

export function Editor({
  content = "",
  onChange,
  onSave,
  className,
  editable = true,
}: EditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [showDocumentSearch, setShowDocumentSearch] = useState(false)
  const [showDocumentCreation, setShowDocumentCreation] = useState(false)
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null)

  const editor = useEditor({
    extensions: defaultEditorConfig.extensions as Extension[],
    content,
    editable,
    autofocus: defaultEditorConfig.autofocus,
    injectCSS: defaultEditorConfig.injectCSS,
    immediatelyRender: false,
    onUpdate: ({ editor }: { editor: TiptapEditor }) => {
      const html = editor.getHTML()
      onChange?.(html)
    },
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  useEffect(() => {
    if (!editor || !onSave) return

    const saveInterval = setInterval(async () => {
      setIsSaving(true)
      try {
        await onSave(editor.getHTML())
        setLastSaved(new Date())
      } catch (error) {
        console.error("Auto-save failed:", error)
      } finally {
        setIsSaving(false)
      }
    }, 30000)

    return () => clearInterval(saveInterval)
  }, [editor, onSave])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (editor && onSave) {
          setIsSaving(true)
          try {
            await onSave(editor.getHTML())
            setLastSaved(new Date())
          } catch (error) {
            console.error("Manual save failed:", error)
          } finally {
            setIsSaving(false)
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [editor, onSave])

  const handleSearchDocuments = () => {
    console.log("Search documents clicked")
    setShowDocumentSearch(true)
  }

  const handleGenerateContent = () => {
    console.log("Generate content clicked - opening document creation panel")
    setShowDocumentCreation(true)
  }

  const handleFlowStart = (flowId: string) => {
    console.log("🎯 Flow started, monitoring:", flowId)
    setActiveFlowId(flowId)
    setShowDocumentCreation(false)
  }

  const handleDocumentReady = (document: string | Record<string, unknown>) => {
    console.log("📄 Document ready, loading into editor:", typeof document)

    if (!editor) {
      console.error("Editor not available")
      return
    }

    let documentContent = ""

    // Extract the actual document content
    if (typeof document === "string") {
      documentContent = document
    } else if (document && typeof document === "object") {
      // Handle different possible structures from agent output
      if ("finalDocument" in document) {
        documentContent = document.finalDocument as string
      } else if ("document" in document) {
        documentContent = document.document as string
      } else if ("content" in document) {
        documentContent = document.content as string
      } else {
        // Fallback: stringify the object
        documentContent = JSON.stringify(document, null, 2)
      }
    }

    // Set the content in the editor
    if (documentContent) {
      editor.commands.setContent(documentContent)
      console.log("✅ Document loaded into editor successfully")

      // Trigger onChange to update parent state
      onChange?.(documentContent)

      // Auto-save the new content if onSave is available
      if (onSave) {
        setIsSaving(true)
        onSave(documentContent)
          .then(() => {
            setLastSaved(new Date())
            console.log("✅ Generated document auto-saved")
          })
          .catch((error) => {
            console.error("❌ Failed to auto-save generated document:", error)
          })
          .finally(() => {
            setIsSaving(false)
          })
      }
    } else {
      console.error("❌ No valid document content found:", document)
    }

    // Clear the active flow
    setActiveFlowId(null)
  }

  if (!isMounted || !editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading editor...</div>
      </div>
    )
  }

  return (
    <DocumentSessionProvider>
      <div className={cn("editor-container flex h-full", className)}>
        {/* Main editor area */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <EditorToolbar
              editor={editor}
              onSearchDocuments={handleSearchDocuments}
              onGenerateContent={handleGenerateContent}
            />
          </div>

          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="max-w-4xl mx-auto p-8">
              {isMounted && (
                <>
                  <BubbleMenu
                    editor={editor}
                    tippyOptions={{
                      duration: 100,
                      placement: "top",
                      appendTo: () => document.body,
                    }}
                  >
                    <EditorBubbleMenu editor={editor} />
                  </BubbleMenu>

                  <FloatingMenu
                    editor={editor}
                    tippyOptions={{
                      duration: 100,
                      placement: "top-start",
                      appendTo: () => document.body,
                    }}
                  >
                    <EditorFloatingMenu editor={editor} />
                  </FloatingMenu>
                </>
              )}

              <AIContextMenu editor={editor}>
                <div className="editor-content-wrapper bg-white rounded-lg shadow-md border border-gray-200 min-h-[600px] transition-shadow hover:shadow-lg">
                  <EditorContent
                    editor={editor}
                    className="tiptap-editor prose prose-lg prose-gray max-w-none focus:outline-none min-h-[500px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[500px]"
                  />
                </div>
              </AIContextMenu>
            </div>
          </div>

          <EditorStats editor={editor} isSaving={isSaving} lastSaved={lastSaved} />
        </div>

        {/* Document Creation Panel - Replaces Modal */}
        {showDocumentCreation && (
          <div className="w-96 border-l bg-background shadow-lg">
            <DocumentCreationPanel
              onClose={() => setShowDocumentCreation(false)}
              onFlowStart={handleFlowStart}
            />
          </div>
        )}

        {/* Agent Progress Dashboard */}
        {activeFlowId && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50">
            <div className="max-w-4xl mx-auto mt-8">
              <AgentProgressDashboard flowId={activeFlowId} onComplete={handleDocumentReady} />
            </div>
          </div>
        )}

        {/* Document Search Dialog - Keep as modal for now */}
        <DocumentSearch
          open={showDocumentSearch}
          onOpenChange={setShowDocumentSearch}
          editor={editor}
        />
      </div>
    </DocumentSessionProvider>
  )
}
