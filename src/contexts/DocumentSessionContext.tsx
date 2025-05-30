"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { DocumentSession } from "@/lib/documents/session-store"

interface DocumentSessionContextType {
  currentSession: DocumentSession | null
  sessionId: string | null
  createNewSession: (metadata?: DocumentSession["metadata"]) => Promise<DocumentSession>
  clearSession: () => void
  addDocumentToCurrentSession: (documentId: string) => Promise<boolean>
  getSessionDocuments: () => string[]
  getDocumentTitles: () => Promise<Record<string, string>>
}

const DocumentSessionContext = createContext<DocumentSessionContextType | undefined>(undefined)

export function DocumentSessionProvider({ children }: { children: React.ReactNode }) {
  const [currentSession, setCurrentSession] = useState<DocumentSession | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load session from localStorage on mount and verify it exists on server
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedSessionId = localStorage.getItem("documentSessionId")

        if (storedSessionId) {
          // Verify the session still exists on the server
          try {
            const response = await fetch(`/api/sessions/${storedSessionId}`)

            if (response.ok) {
              const session = await response.json()
              setCurrentSession(session)
              setSessionId(session.id)
              console.log("✅ Loaded existing session:", session.id)
            } else if (response.status === 404) {
              // Session not found on server, clear it from localStorage
              console.log("⚠️ Session not found on server, clearing localStorage")
              localStorage.removeItem("documentSessionId")
              // Don't throw error, just let it create a new session
            } else {
              throw new Error("Failed to verify session")
            }
          } catch (error) {
            console.error("Failed to verify session:", error)
            localStorage.removeItem("documentSessionId")
            // Don't throw, let it proceed to create a new session if needed
          }
        }
      } catch (error) {
        console.error("Error loading session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [])

  const createNewSession = useCallback(async (metadata?: DocumentSession["metadata"]) => {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata }),
      })

      if (!response.ok) throw new Error("Failed to create session")

      const session = await response.json()
      setCurrentSession(session)
      setSessionId(session.id)

      // Store in localStorage
      localStorage.setItem("documentSessionId", session.id)

      return session
    } catch (error) {
      console.error("Failed to create session:", error)
      throw error
    }
  }, [])

  const clearSession = useCallback(() => {
    setCurrentSession(null)
    setSessionId(null)
    localStorage.removeItem("documentSessionId")
  }, [])

  const addDocumentToCurrentSession = useCallback(
    async (documentId: string) => {
      if (!sessionId) {
        console.error("No active session")
        return false
      }

      try {
        const response = await fetch(`/api/sessions/${sessionId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        })

        if (!response.ok) {
          throw new Error("Failed to add document to session")
        }

        // Update local session state
        if (currentSession) {
          setCurrentSession({
            ...currentSession,
            documents: [...currentSession.documents, documentId],
            updatedAt: new Date(),
          })
        }

        return true
      } catch (error) {
        console.error("Failed to add document to session:", error)
        return false
      }
    },
    [sessionId, currentSession]
  )

  const getSessionDocuments = useCallback(() => {
    return currentSession?.documents || []
  }, [currentSession])

  const getDocumentTitles = useCallback(async (): Promise<Record<string, string>> => {
    if (!sessionId) return {}

    try {
      const response = await fetch(`/api/sessions/${sessionId}/document-titles`)
      if (!response.ok) {
        console.error("Failed to fetch document titles")
        return {}
      }

      const titles = await response.json()
      return titles
    } catch (error) {
      console.error("Error fetching document titles:", error)
      return {}
    }
  }, [sessionId])

  // Auto-create session if needed when not loading
  useEffect(() => {
    if (!isLoading && !currentSession && !sessionId) {
      createNewSession()
    }
  }, [isLoading, currentSession, sessionId, createNewSession])

  return (
    <DocumentSessionContext.Provider
      value={{
        currentSession,
        sessionId,
        createNewSession,
        clearSession,
        addDocumentToCurrentSession,
        getSessionDocuments,
        getDocumentTitles,
      }}
    >
      {children}
    </DocumentSessionContext.Provider>
  )
}

export function useDocumentSession() {
  const context = useContext(DocumentSessionContext)
  if (!context) {
    throw new Error("useDocumentSession must be used within DocumentSessionProvider")
  }
  return context
}
