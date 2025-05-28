"use client"

import { useState, useEffect, useCallback } from "react"
import { Editor } from "@tiptap/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Clock, Loader2 } from "lucide-react"
import { SearchResult } from "@/lib/search/document-search"
import { ClientSearchService } from "@/lib/search/client-search"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { formatDistanceToNow } from "date-fns"

interface DocumentSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor
}

// Create search service instance outside component to prevent recreation
const searchService = new ClientSearchService()

export function DocumentSearch({ open, onOpenChange, editor }: DocumentSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [searchType, setSearchType] = useState<"all" | "semantic" | "keyword">("all")
  const [hasAICapability, setHasAICapability] = useState(false)

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    // Load recent searches from localStorage
    const stored = localStorage.getItem("recent_searches")
    if (stored) {
      setRecentSearches(JSON.parse(stored))
    }

    // Check AI capability from server
    const checkAI = async () => {
      const hasAI = await searchService.checkAICapability()
      setHasAICapability(hasAI)

      // If no AI capability, default to keyword search
      if (!hasAI && searchType !== "keyword") {
        setSearchType("keyword")
      }

      console.log("AI capabilities available:", hasAI)
      if (!hasAI) {
        console.log("No AI API keys found - search will use keyword matching only")
      }
    }

    // Debug: Check if there are any documents in the store
    const checkDocuments = async () => {
      try {
        const response = await fetch("/api/documents")
        if (response.ok) {
          const data = await response.json()
          console.log("Documents from document store:", data.documents.length)
          console.log("Document stats:", data.stats)
        }
      } catch (error) {
        console.error("Error checking documents:", error)
      }
    }

    checkAI()
    checkDocuments()
  }, [])

  const performSearch = useCallback(async () => {
    console.log("performSearch called with query:", debouncedQuery)

    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    console.log("Starting search with type:", searchType)

    try {
      console.log("Calling searchService.search with:", {
        query: debouncedQuery,
        options: { limit: 20, searchType: searchType === "all" ? "hybrid" : searchType },
      })

      const searchResults = await searchService.search(debouncedQuery, {
        limit: 20,
        searchType: searchType === "all" ? "hybrid" : searchType,
      })

      console.log("Search results:", searchResults)
      setResults(searchResults)

      // Update recent searches
      setRecentSearches((prev) => {
        const updated = [debouncedQuery, ...prev.filter((s) => s !== debouncedQuery)].slice(0, 5)
        localStorage.setItem("recent_searches", JSON.stringify(updated))
        return updated
      })
    } catch (error) {
      console.error("Search error in performSearch:", error)
      // Set empty results on error so UI doesn't break
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [debouncedQuery, searchType])

  useEffect(() => {
    if (query.trim()) {
      performSearch()
    } else {
      setResults([])
    }
  }, [query, searchType, performSearch])

  const insertReference = (result: SearchResult) => {
    const reference = `[${result.title}](ref:${result.documentId})`
    editor.chain().focus().insertContent(reference).run()
    onOpenChange(false)
  }

  const insertQuote = (result: SearchResult) => {
    const quote = `> ${result.snippet}\n> — *${result.title}*`
    editor.chain().focus().insertContent(quote).run()
    onOpenChange(false)
  }

  const insertContent = (result: SearchResult) => {
    editor.chain().focus().insertContent(result.snippet).run()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] p-0">
        <div className="flex h-full">
          {/* Search Panel */}
          <div className="flex-1 flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Search Documents</DialogTitle>
              <DialogDescription>
                Find and reference content from your uploaded documents
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search across all your documents..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>

              {/* Search Type Tabs */}
              <div className="space-y-2">
                <Tabs
                  value={searchType}
                  onValueChange={(v) => setSearchType(v as "all" | "semantic" | "keyword")}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all" disabled={!hasAICapability}>
                      All {!hasAICapability && "(Keyword Only)"}
                    </TabsTrigger>
                    <TabsTrigger value="semantic" disabled={!hasAICapability}>
                      AI Semantic {!hasAICapability && "(Unavailable)"}
                    </TabsTrigger>
                    <TabsTrigger value="keyword">Keyword</TabsTrigger>
                  </TabsList>
                </Tabs>
                {!hasAICapability && (
                  <p className="text-xs text-muted-foreground">
                    💡 Add API keys to .env.local to enable AI-powered semantic search
                  </p>
                )}
              </div>

              {/* Results or Recent Searches */}
              <ScrollArea className="h-[350px]">
                {query ? (
                  <div className="space-y-2">
                    {results.length === 0 && !isSearching && (
                      <div className="text-center py-8 text-muted-foreground">
                        No results found for &ldquo;{query}&rdquo;
                      </div>
                    )}
                    {results.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => setSelectedResult(result)}
                        className={`w-full text-left p-4 rounded-lg border transition-colors ${
                          selectedResult?.id === result.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <h4 className="font-medium truncate">{result.title}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {result.snippet}
                            </p>
                            {result.metadata.source && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {result.metadata.fileType}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {result.metadata.wordCount} words
                                </span>
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            {Math.round(result.score * 100)}%
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentSearches.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Recent Searches
                        </h3>
                        <div className="space-y-1">
                          {recentSearches.map((search, index) => (
                            <button
                              key={index}
                              onClick={() => setQuery(search)}
                              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                            >
                              {search}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Preview Panel */}
          {selectedResult && (
            <div className="w-80 border-l flex flex-col">
              <div className="p-6 border-b">
                <h3 className="font-medium">{selectedResult.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Match score: {Math.round(selectedResult.score * 100)}%
                </p>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="prose prose-sm max-w-none">
                  <p>{selectedResult.snippet}</p>
                </div>

                {selectedResult.metadata && (
                  <div className="mt-4 space-y-2">
                    {selectedResult.metadata.fileType && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Type:</span>{" "}
                        {selectedResult.metadata.fileType}
                      </div>
                    )}
                    {selectedResult.metadata.wordCount && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Words:</span>{" "}
                        {selectedResult.metadata.wordCount}
                      </div>
                    )}
                    {selectedResult.metadata.processedAt && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Added:</span>{" "}
                        {formatDistanceToNow(new Date(selectedResult.metadata.processedAt))} ago
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t space-y-2">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => insertReference(selectedResult)}
                >
                  Insert Reference
                </Button>
                <Button
                  className="w-full"
                  size="sm"
                  variant="outline"
                  onClick={() => insertQuote(selectedResult)}
                >
                  Insert as Quote
                </Button>
                <Button
                  className="w-full"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertContent(selectedResult)}
                >
                  Insert Content
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
