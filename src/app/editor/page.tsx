"use client"

import { useState } from "react"
import { Editor } from "@/components/editor/Editor"

export default function EditorPage() {
  const [content, setContent] = useState("")

  const handleSave = async (newContent: string) => {
    console.log("Saving document...", newContent.length, "characters")
    // TODO: Implement actual save functionality
    // For now, just log to console
    await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate save delay
  }

  return (
    <div className="h-screen flex flex-col">
      <Editor content={content} onChange={setContent} onSave={handleSave} className="flex-1" />
    </div>
  )
}
