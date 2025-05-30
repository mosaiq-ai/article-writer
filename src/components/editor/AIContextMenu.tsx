"use client"

import { ReactNode, useState, useEffect, useRef } from "react"
import { Editor } from "@tiptap/react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Edit3,
  Sparkles,
  CheckCircle,
  Minus,
  Expand,
  RefreshCw,
  Languages,
  BookOpen,
  FileCheck,
  Plus,
  Quote,
} from "lucide-react"
import { SelectionInfo, DocumentContext } from "@/lib/editor/ai-editor-service"
import { AIEditDialog } from "./AIEditDialog"
import { AIChangeReview } from "./AIChangeReview"
import { AIChangeTracker, AIChange, ChangeSnapshot } from "@/lib/editor/ai-change-tracker"
import { useDocumentSession } from "@/contexts/DocumentSessionContext"
import { prepareHtmlForEditor } from "@/lib/editor/html-sanitizer"
import { DOMSerializer, DOMParser } from "@tiptap/pm/model"
import { TextSelection } from "@tiptap/pm/state"

interface AIContextMenuProps {
  editor: Editor
  children: ReactNode
}

export function AIContextMenu({ editor, children }: AIContextMenuProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string>("")
  const [result, setResult] = useState<string | null>(null)
  const [sourcesUsed, setSourcesUsed] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentSelection, setCurrentSelection] = useState<SelectionInfo | null>(null)

  // AI Change Tracking State
  const [showChangeReview, setShowChangeReview] = useState(false)
  const [currentTrackingId, setCurrentTrackingId] = useState<string | null>(null)
  const [trackedChanges, setTrackedChanges] = useState<AIChange[]>([])
  const [changeSnapshot, setChangeSnapshot] = useState<ChangeSnapshot | null>(null)
  const changeTracker = useRef<AIChangeTracker | null>(null)

  // Get document session context
  const { sessionId, getSessionDocuments } = useDocumentSession()

  // Initialize change tracker
  useEffect(() => {
    if (editor && !changeTracker.current) {
      changeTracker.current = new AIChangeTracker(editor)
      console.log("🎯 AI Context Menu: Initialized change tracker")
    }
  }, [editor])

  const getSelection = (): SelectionInfo | null => {
    const { selection: editorSelection } = editor.state
    if (editorSelection.empty) return null

    let from = editorSelection.from
    let to = editorSelection.to

    // FIXED: Expand selection to include complete table if we're inside one
    const startResolvedPos = editor.state.doc.resolve(from)
    const endResolvedPos = editor.state.doc.resolve(to)

    // Check if we're inside a table and expand to include the whole table
    let tableStart = -1
    let tableEnd = -1

    // Walk up the document tree to find table boundaries
    for (let depth = startResolvedPos.depth; depth >= 0; depth--) {
      const node = startResolvedPos.node(depth)
      if (node.type.name === "table") {
        tableStart = startResolvedPos.start(depth)
        break
      }
    }

    for (let depth = endResolvedPos.depth; depth >= 0; depth--) {
      const node = endResolvedPos.node(depth)
      if (node.type.name === "table") {
        tableEnd = endResolvedPos.end(depth)
        break
      }
    }

    // If we found table boundaries, expand the selection
    if (tableStart !== -1 && tableEnd !== -1) {
      console.log("🔬 🎯 FOUND TABLE SELECTION!")
      console.log("🔬 Original selection:", { from, to })
      console.log("🔬 Table boundaries:", { tableStart, tableEnd })

      // Expand selection to cover the entire table
      from = tableStart
      to = tableEnd

      console.log("🔬 Expanded selection:", { from, to })
    }

    // Get the selected text (for fallback)
    let selectedText = editor.state.doc.textBetween(from, to)

    // FIXED: Extract visual HTML instead of internal ProseMirror structure
    let selectedHTML = selectedText // fallback
    let beforeHTML = ""
    let afterHTML = ""

    try {
      console.log("🔬 === HTML EXTRACTION (SIMPLIFIED) ===")

      // Use ProseMirror's DOMSerializer to extract the selection HTML
      const schema = editor.schema
      const serializer = DOMSerializer.fromSchema(schema)

      // Create a proper selection for the expanded range
      const expandedSelection = TextSelection.create(editor.state.doc, from, to)
      const selectionFragment = expandedSelection.content()
      const fragment = selectionFragment.content

      // Serialize the fragment to DOM
      const tempDiv = document.createElement("div")
      const domFragment = serializer.serializeFragment(fragment)
      tempDiv.appendChild(domFragment)
      selectedHTML = tempDiv.innerHTML

      console.log("🔬 Selected text:", selectedText.substring(0, 100) + "...")
      console.log("🔬 Extracted HTML:", selectedHTML.substring(0, 200) + "...")
      console.log("🔬 HTML vs Text same?", selectedHTML === selectedText)

      // FIXED: Extract complete text from HTML when textBetween is incomplete
      if (selectedHTML && selectedHTML !== selectedText) {
        // Check if we have a substantial HTML structure (like tables, lists, etc.)
        if (
          selectedHTML.includes("<table") ||
          selectedHTML.includes("<ul") ||
          selectedHTML.includes("<ol") ||
          selectedHTML.length > selectedText.length * 2
        ) {
          console.log("🔬 Detected complex HTML structure, extracting text from HTML")

          // Create a temporary element to extract text content
          const textExtractor = document.createElement("div")
          textExtractor.innerHTML = selectedHTML
          const extractedText = textExtractor.textContent || textExtractor.innerText || ""

          // Only use extracted text if it's significantly more complete
          if (extractedText.length > selectedText.length) {
            selectedText = extractedText
            console.log(
              "🔬 Using extracted text from HTML:",
              selectedText.substring(0, 200) + "..."
            )
          }
        }
      }

      // Get context around the selection
      const contextSize = 1000
      const beforeContent = editor.state.doc.textBetween(Math.max(0, from - contextSize), from)
      const afterContent = editor.state.doc.textBetween(
        to,
        Math.min(editor.state.doc.content.size, to + contextSize)
      )

      beforeHTML = beforeContent
      afterHTML = afterContent
    } catch (error) {
      console.error("🔥 Failed to extract HTML from selection:", error)
      if (error instanceof Error) {
        console.error("🔥 Error stack:", error.stack)
      }
      selectedHTML = selectedText
    }

    console.log("🔬 === EXTRACTION COMPLETE ===")

    return {
      text: selectedText,
      from,
      to,
      isEmpty: false,
      context: {
        before: beforeHTML.slice(-500), // Last 500 chars before
        after: afterHTML.slice(0, 500), // First 500 chars after
      },
      htmlContext: {
        selectedHTML,
        beforeHTML,
        afterHTML,
      },
    }
  }

  const handleAIAction = async (action: string) => {
    const selectionInfo = getSelection()
    if (!selectionInfo || selectionInfo.isEmpty) return

    setCurrentSelection(selectionInfo)
    setSelectedAction(action)
    setResult(null) // Clear any previous result
    setSourcesUsed([])

    // Start tracking changes BEFORE AI operation
    if (changeTracker.current) {
      const trackingId = changeTracker.current.startTracking(action)
      setCurrentTrackingId(trackingId)
      console.log("🎯 Starting AI change tracking for action:", action)
    }

    // Check if this action needs custom instructions (custom OR document-aware actions)
    const isDocumentAwareAction = [
      "add_from_sources",
      "verify_against_sources",
      "expand_with_sources",
      "cite_sources",
    ].includes(action.split(":")[0])

    if (action === "custom" || isDocumentAwareAction) {
      // Show the dialog with custom instructions screen
      setShowEditDialog(true)
      return
    }

    // Process simple actions immediately
    setIsLoading(true)
    try {
      // Get document context for document-aware actions
      const documentContext: DocumentContext = {
        sessionId: sessionId || undefined,
        documentIds: sessionId ? getSessionDocuments() : undefined,
      }

      // Call the API route instead of the service directly
      const response = await fetch("/api/ai/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selection: selectionInfo,
          action,
          customPrompt: undefined, // no custom prompt for predefined actions
          model: undefined, // use default model
          documentContext, // pass document context
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process AI edit")
      }

      const data = await response.json()
      const editResult = data.result

      setResult(editResult.text)
      setSourcesUsed(editResult.sourcesUsed || [])
      setShowEditDialog(true)
    } catch (error) {
      console.error("AI action failed:", error)
      // Handle error - maybe show a toast
    } finally {
      setIsLoading(false)
    }
  }

  // Handle applying AI changes with change tracking
  const handleApplyChanges = (newText: string) => {
    if (currentSelection) {
      console.log("🔥 === FIXED INSERTION METHOD ===")
      console.log("🔥 Original selected text:", currentSelection.text)
      console.log("🔥 AI returned HTML:", newText)
      console.log("🔥 Selection positions:", {
        from: currentSelection.from,
        to: currentSelection.to,
      })

      const { from, to } = currentSelection

      // Sanitize the HTML
      const safeHtml = prepareHtmlForEditor(newText)
      console.log("🔥 Sanitized HTML:", safeHtml)

      // FIXED: Use position-based replacement with table-aware handling
      try {
        console.log("🔥 Using improved table-aware replacement...")

        // Check if we're dealing with a table replacement
        const isTableReplacement =
          safeHtml.includes("<table") &&
          currentSelection.htmlContext?.selectedHTML.includes("<table")

        if (isTableReplacement) {
          console.log("🔥 🎯 TABLE REPLACEMENT DETECTED")

          // For table replacements, we need to replace the entire table node
          // Find the table node and replace it entirely
          const startPos = editor.state.doc.resolve(from)
          let tableNode = null
          let tablePos = -1
          let tableDepth = -1

          // Find the table node at this position
          for (let depth = startPos.depth; depth >= 0; depth--) {
            const node = startPos.node(depth)
            if (node.type.name === "table") {
              tableNode = node
              tablePos = startPos.start(depth)
              tableDepth = depth
              break
            }
          }

          if (tableNode && tablePos !== -1) {
            console.log("🔥 Found table node at position:", tablePos)
            console.log("🔥 Table depth:", tableDepth)

            // Get the exact table boundaries
            const tableEndPos = tablePos + tableNode.nodeSize
            console.log("🔥 Table range:", { start: tablePos, end: tableEndPos })

            // FIXED: Use transaction-based replacement for precise control
            const tr = editor.state.tr

            // Delete the old table
            tr.delete(tablePos, tableEndPos)

            // Parse the new HTML content
            const tempDiv = document.createElement("div")
            tempDiv.innerHTML = safeHtml
            const parser = DOMParser.fromSchema(editor.schema)
            const newContent = parser.parseSlice(tempDiv)

            // Insert the new table at the exact position
            tr.insert(tablePos, newContent.content)

            // Apply the transaction
            const success = editor.view.dispatch(tr)
            console.log("🔥 Transaction-based table replacement result:", success)
          } else {
            console.log("🔥 ⚠️ Could not find table node, falling back to regular replacement")
            // Fallback to regular replacement
            const success = editor
              .chain()
              .focus()
              .setTextSelection({ from, to })
              .deleteSelection()
              .insertContent(safeHtml)
              .run()
            console.log("🔥 Fallback replacement result:", success)
          }
        } else {
          console.log("🔥 Regular content replacement")
          // Regular content replacement
          const success = editor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .deleteSelection()
            .insertContent(safeHtml, {
              parseOptions: {
                preserveWhitespace: "full",
              },
              updateSelection: false,
            })
            .run()

          console.log("🔥 Regular replacement result:", success)
        }

        // Check the result after a brief delay
        setTimeout(() => {
          const finalContent = editor.getHTML()
          console.log("🔥 Final content check:", finalContent.substring(0, 500))

          // If it still looks wrong, we have a deeper issue
          if (!finalContent.includes(safeHtml.substring(0, 50))) {
            console.log("🔥 ❌ Content insertion failed - may need schema debugging")
          } else {
            console.log("🔥 ✅ Content insertion successful!")
          }
        }, 100)
      } catch (error) {
        console.error("🔥 ❌ Insertion error:", error)
      }

      // Stop tracking and show review if changes detected
      if (changeTracker.current && currentTrackingId) {
        const changes = changeTracker.current.stopTracking()
        const snapshot = changeTracker.current.getSnapshot(currentTrackingId)

        if (changes && changes.length > 0 && snapshot) {
          setTrackedChanges(changes)
          setChangeSnapshot(snapshot)
          setShowChangeReview(true)
          console.log("🎯 Changes detected, showing review interface")
        } else {
          console.log("🎯 No changes detected, clearing tracking")
          setCurrentTrackingId(null)
        }
      }
    }
    setShowEditDialog(false)
  }

  // Handle change review actions
  const handleAcceptAllChanges = () => {
    if (changeTracker.current && currentTrackingId) {
      changeTracker.current.acceptAllChanges(currentTrackingId)
      changeTracker.current.clearTracking(currentTrackingId)
    }
    setShowChangeReview(false)
    setCurrentTrackingId(null)
    setTrackedChanges([])
    setChangeSnapshot(null)
  }

  const handleRejectAllChanges = () => {
    if (changeTracker.current && currentTrackingId) {
      changeTracker.current.rejectAllChanges(currentTrackingId)
      changeTracker.current.clearTracking(currentTrackingId)
    }
    setShowChangeReview(false)
    setCurrentTrackingId(null)
    setTrackedChanges([])
    setChangeSnapshot(null)
  }

  const handleAcceptChange = (changeId: string) => {
    if (changeTracker.current) {
      changeTracker.current.acceptChange(changeId)
    }
    // For simplicity, accept single change accepts all for now
    handleAcceptAllChanges()
  }

  const handleRejectChange = (changeId: string) => {
    if (changeTracker.current && currentTrackingId) {
      changeTracker.current.rejectChange(currentTrackingId, changeId)
    }
    // For simplicity, reject single change rejects all for now
    handleRejectAllChanges()
  }

  const currentSelectionInfo = getSelection()

  const quickActions = [
    { id: "improve", label: "Improve", icon: Sparkles },
    { id: "fix", label: "Fix Grammar", icon: CheckCircle },
    { id: "shorten", label: "Make Concise", icon: Minus },
    { id: "expand", label: "Expand", icon: Expand },
  ]

  const documentActions = [
    { id: "add_from_sources", label: "Add from Sources", icon: Plus },
    { id: "verify_against_sources", label: "Verify with Sources", icon: FileCheck },
    { id: "expand_with_sources", label: "Expand with Sources", icon: BookOpen },
    { id: "cite_sources", label: "Add Citations", icon: Quote },
  ]

  const toneActions = [
    { id: "professional", label: "Professional" },
    { id: "casual", label: "Casual" },
    { id: "formal", label: "Formal" },
    { id: "friendly", label: "Friendly" },
    { id: "confident", label: "Confident" },
    { id: "diplomatic", label: "Diplomatic" },
  ]

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {currentSelectionInfo && !currentSelectionInfo.isEmpty && (
            <>
              <div className="px-2 py-1.5 text-sm font-semibold">AI Actions</div>
              {quickActions.map((action) => (
                <ContextMenuItem key={action.id} onClick={() => handleAIAction(action.id)}>
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </ContextMenuItem>
              ))}

              <ContextMenuSeparator />

              {/* Document-Aware Actions */}
              {sessionId && (
                <>
                  <div className="px-2 py-1.5 text-sm font-semibold text-blue-600">
                    Source Document Actions
                  </div>
                  {documentActions.map((action) => (
                    <ContextMenuItem key={action.id} onClick={() => handleAIAction(action.id)}>
                      <action.icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </ContextMenuItem>
                  ))}

                  <ContextMenuSeparator />
                </>
              )}

              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Change Tone
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {toneActions.map((tone) => (
                    <ContextMenuItem
                      key={tone.id}
                      onClick={() => handleAIAction(`tone:${tone.id}`)}
                    >
                      {tone.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>

              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Languages className="mr-2 h-4 w-4" />
                  Translate
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => handleAIAction("translate:spanish")}>
                    Spanish
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAIAction("translate:french")}>
                    French
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAIAction("translate:german")}>
                    German
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAIAction("translate:chinese")}>
                    Chinese
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>

              <ContextMenuSeparator />

              <ContextMenuItem onClick={() => handleAIAction("custom")}>
                <Edit3 className="mr-2 h-4 w-4" />
                Custom Edit...
              </ContextMenuItem>
            </>
          )}

          {/* Standard editor actions */}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => editor.chain().focus().undo().run()}>
            Undo
          </ContextMenuItem>
          <ContextMenuItem onClick={() => editor.chain().focus().redo().run()}>
            Redo
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => document.execCommand("copy")}>Copy</ContextMenuItem>
          <ContextMenuItem onClick={() => document.execCommand("cut")}>Cut</ContextMenuItem>
          <ContextMenuItem onClick={() => document.execCommand("paste")}>Paste</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AIEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        action={selectedAction}
        selection={currentSelection}
        result={result}
        sourcesUsed={sourcesUsed}
        isLoading={isLoading}
        onApply={handleApplyChanges} // Use our new handler with change tracking
        onRegenerate={async (customPrompt?: string, selectedSources?: string[]) => {
          if (!currentSelection) return

          setIsLoading(true)
          setResult(null) // Clear result when starting regeneration
          try {
            // Get document context for document-aware actions
            const documentContext: DocumentContext = {
              sessionId: sessionId || undefined,
              documentIds:
                selectedSources && selectedSources.length > 0
                  ? selectedSources
                  : sessionId
                    ? getSessionDocuments()
                    : undefined,
            }

            // Call the API route instead of the service directly
            const response = await fetch("/api/ai/edit", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                selection: currentSelection,
                action: selectedAction,
                customPrompt,
                model: undefined,
                documentContext,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || "Failed to process AI edit")
            }

            const data = await response.json()
            const editResult = data.result

            setResult(editResult.text)
            setSourcesUsed(editResult.sourcesUsed || [])
          } catch (error) {
            console.error("Regeneration failed:", error)
          } finally {
            setIsLoading(false)
          }
        }}
      />

      {/* AI Change Review Interface */}
      {showChangeReview && changeTracker.current && (
        <AIChangeReview
          tracker={changeTracker.current}
          trackingId={currentTrackingId}
          changes={trackedChanges}
          snapshot={changeSnapshot}
          onAcceptAll={handleAcceptAllChanges}
          onRejectAll={handleRejectAllChanges}
          onAcceptChange={handleAcceptChange}
          onRejectChange={handleRejectChange}
          onClose={() => {
            setShowChangeReview(false)
            // Keep tracking data in case user wants to review again
          }}
        />
      )}
    </>
  )
}
