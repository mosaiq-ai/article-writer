import { Editor } from "@tiptap/react"
import { Node as ProseMirrorNode } from "@tiptap/pm/model"

export interface AIChange {
  id: string
  type: "addition" | "deletion" | "modification"
  from: number
  to: number
  originalText: string
  newText: string
  action: string
  timestamp: Date
}

export interface ChangeSnapshot {
  id: string
  content: string
  doc: ProseMirrorNode
  timestamp: Date
  action: string
}

export class AIChangeTracker {
  private editor: Editor
  private snapshots: Map<string, ChangeSnapshot> = new Map()
  private changes: Map<string, AIChange[]> = new Map()
  private isTracking = false
  private currentTrackingId: string | null = null

  constructor(editor: Editor) {
    this.editor = editor
  }

  /**
   * Start tracking changes for an AI operation
   */
  startTracking(action: string): string {
    const trackingId = `tracking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Take a snapshot of the current editor state
    const snapshot: ChangeSnapshot = {
      id: trackingId,
      content: this.editor.getHTML(),
      doc: this.editor.state.doc.copy(),
      timestamp: new Date(),
      action,
    }

    this.snapshots.set(trackingId, snapshot)
    this.currentTrackingId = trackingId
    this.isTracking = true

    console.log("🎯 AI Change Tracker: Started tracking for", action, "with ID:", trackingId)

    return trackingId
  }

  /**
   * Stop tracking and analyze changes
   */
  stopTracking(): AIChange[] | null {
    if (!this.isTracking || !this.currentTrackingId) {
      return null
    }

    const trackingId = this.currentTrackingId
    const snapshot = this.snapshots.get(trackingId)

    if (!snapshot) {
      return null
    }

    // Get current state
    const currentContent = this.editor.getHTML()
    const currentDoc = this.editor.state.doc

    // Analyze differences
    const changes = this.analyzeChanges(
      snapshot.content,
      currentContent,
      snapshot.doc,
      currentDoc,
      snapshot.action
    )

    this.changes.set(trackingId, changes)
    this.isTracking = false
    this.currentTrackingId = null

    console.log(
      "🔍 AI Change Tracker: Detected",
      changes.length,
      "changes for tracking ID:",
      trackingId
    )

    return changes
  }

  /**
   * Get changes for a specific tracking session
   */
  getChanges(trackingId: string): AIChange[] | null {
    return this.changes.get(trackingId) || null
  }

  /**
   * Get snapshot for a specific tracking session
   */
  getSnapshot(trackingId: string): ChangeSnapshot | null {
    return this.snapshots.get(trackingId) || null
  }

  /**
   * Accept a specific change
   */
  acceptChange(changeId: string): void {
    // Change is already applied, just mark as accepted
    console.log("✅ AI Change Tracker: Accepted change", changeId)
  }

  /**
   * Reject a specific change and revert it
   */
  rejectChange(trackingId: string, changeId: string): void {
    const snapshot = this.snapshots.get(trackingId)
    if (!snapshot) {
      console.error("❌ AI Change Tracker: No snapshot found for tracking ID:", trackingId)
      return
    }

    // Revert to the snapshot content
    this.editor.commands.setContent(snapshot.content)
    console.log("↩️ AI Change Tracker: Reverted change", changeId, "to snapshot state")
  }

  /**
   * Accept all changes for a tracking session
   */
  acceptAllChanges(trackingId: string): void {
    const changes = this.changes.get(trackingId)
    if (changes) {
      changes.forEach((change) => this.acceptChange(change.id))
      console.log("✅ AI Change Tracker: Accepted all", changes.length, "changes")
    }
  }

  /**
   * Reject all changes and revert to original
   */
  rejectAllChanges(trackingId: string): void {
    const snapshot = this.snapshots.get(trackingId)
    if (!snapshot) {
      console.error("❌ AI Change Tracker: No snapshot found for tracking ID:", trackingId)
      return
    }

    this.editor.commands.setContent(snapshot.content)
    console.log("↩️ AI Change Tracker: Reverted all changes to snapshot state")
  }

  /**
   * Clear tracking data for a session
   */
  clearTracking(trackingId: string): void {
    this.snapshots.delete(trackingId)
    this.changes.delete(trackingId)
    console.log("🧹 AI Change Tracker: Cleared tracking data for", trackingId)
  }

  /**
   * Get visual diff for display
   */
  getVisualDiff(trackingId: string): { before: string; after: string } | null {
    const snapshot = this.snapshots.get(trackingId)
    if (!snapshot) return null

    return {
      before: snapshot.content,
      after: this.editor.getHTML(),
    }
  }

  /**
   * Analyze changes between two document states
   */
  private analyzeChanges(
    beforeContent: string,
    afterContent: string,
    beforeDoc: ProseMirrorNode,
    afterDoc: ProseMirrorNode,
    action: string
  ): AIChange[] {
    const changes: AIChange[] = []

    // Simple text-based diff for now
    // In a more sophisticated implementation, we'd do document-level diffing

    if (beforeContent !== afterContent) {
      const changeId = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Determine change type
      let changeType: "addition" | "deletion" | "modification" = "modification"

      if (afterContent.length > beforeContent.length) {
        changeType = "addition"
      } else if (afterContent.length < beforeContent.length) {
        changeType = "deletion"
      }

      changes.push({
        id: changeId,
        type: changeType,
        from: 0, // Start of document for now
        to: afterDoc.content.size, // End of document
        originalText: beforeContent,
        newText: afterContent,
        action,
        timestamp: new Date(),
      })
    }

    return changes
  }

  /**
   * Check if currently tracking changes
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking
  }

  /**
   * Get current tracking ID
   */
  getCurrentTrackingId(): string | null {
    return this.currentTrackingId
  }
}
