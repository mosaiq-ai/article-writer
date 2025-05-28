"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { FileText, Wand2 } from "lucide-react"

interface DocumentMetadata {
  fileType: string
  wordCount: number
  processedAt: string
  source: string
  estimatedTokens: number
  size: number
}

interface Document {
  id: string
  title: string
  metadata: DocumentMetadata
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [testing, setTesting] = useState(false)

  const handleFileUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        alert("Document uploaded successfully!")
        loadDocuments()
      } else {
        alert("Upload failed: " + result.error)
      }
    } catch (error) {
      alert("Upload error: " + error)
    } finally {
      setUploading(false)
    }
  }

  const loadDocuments = async () => {
    try {
      const response = await fetch("/api/documents/upload")
      const result = await response.json()
      if (result.success) {
        setDocuments(result.documents)
      }
    } catch (error) {
      console.error("Failed to load documents:", error)
    }
  }

  const testAI = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      })

      const result = await response.json()
      if (result.success) {
        setAiResponse(result.result.text)
      } else {
        setAiResponse("Error: " + result.error)
      }
    } catch (error) {
      setAiResponse("Error: " + error)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Document Editor Dashboard</h1>

      {/* Document Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>Upload PDF, Word, or text documents for processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button onClick={handleFileUpload} disabled={!file || uploading}>
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Uploaded documents ready for AI processing</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadDocuments} className="mb-4">
            Refresh Documents
          </Button>
          {documents.length === 0 ? (
            <p className="text-muted-foreground">No documents uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="p-3 border rounded">
                  <h3 className="font-medium">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {doc.metadata.fileType} • {doc.metadata.wordCount} words
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Testing Section */}
      <Card>
        <CardHeader>
          <CardTitle>Test AI Integration</CardTitle>
          <CardDescription>Test the AI service with document tools</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prompt">AI Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Enter a prompt to test AI functionality..."
              value={aiPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiPrompt(e.target.value)}
            />
          </div>
          <Button onClick={testAI} disabled={!aiPrompt || testing}>
            {testing ? "Testing..." : "Test AI"}
          </Button>
          {aiResponse && (
            <div className="p-4 bg-muted rounded">
              <h4 className="font-medium mb-2">AI Response:</h4>
              <p className="whitespace-pre-wrap">{aiResponse}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              AI Document Editor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create intelligent documents with our AI agent system
            </p>
            <Button asChild className="w-full">
              <Link href="/editor">
                <Wand2 className="mr-2 h-4 w-4" />
                Open Editor
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
        </Card>
      </div>
    </div>
  )
}
