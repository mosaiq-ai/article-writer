"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Check,
  X,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Clock,
  Sparkles,
  Plus,
  Minus,
} from "lucide-react"
import { AIChange, ChangeSnapshot, AIChangeTracker } from "@/lib/editor/ai-change-tracker"
import { formatDistanceToNow } from "date-fns"

interface AIChangeReviewProps {
  tracker: AIChangeTracker
  trackingId: string | null
  changes: AIChange[]
  snapshot: ChangeSnapshot | null
  onAcceptAll: () => void
  onRejectAll: () => void
  onAcceptChange: (changeId: string) => void
  onRejectChange: (changeId: string) => void
  onClose: () => void
}

export function AIChangeReview({
  tracker,
  trackingId,
  changes,
  snapshot,
  onAcceptAll,
  onRejectAll,
  onAcceptChange,
  onRejectChange,
  onClose,
}: AIChangeReviewProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [selectedTab, setSelectedTab] = useState("overview")

  if (!trackingId || !snapshot || changes.length === 0) {
    return null
  }

  const diff = tracker.getVisualDiff(trackingId)

  const getChangeTypeColor = (type: AIChange["type"]) => {
    switch (type) {
      case "addition":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "deletion":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "modification":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-w-[90vw] shadow-lg border z-50 bg-white dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm">AI Changes Review</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {changes.length} change{changes.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {snapshot && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Action: {snapshot.action}</span>
            <span>•</span>
            <span>{formatDistanceToNow(snapshot.timestamp, { addSuffix: true })}</span>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="overview" className="text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="diff" className="text-xs">
                Diff View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              <div className="space-y-2">
                {changes.map((change) => (
                  <div
                    key={change.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Badge className={`text-xs ${getChangeTypeColor(change.type)}`}>
                        {change.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {change.type === "addition"
                          ? "Added content"
                          : change.type === "deletion"
                            ? "Removed content"
                            : "Modified content"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAcceptChange(change.id)}
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRejectChange(change.id)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={onAcceptAll} size="sm" className="flex-1 text-xs">
                  <Check className="mr-1 h-3 w-3" />
                  Accept All
                </Button>
                <Button
                  onClick={onRejectAll}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Revert All
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="diff" className="space-y-3">
              {diff && (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1">
                      <Minus className="h-3 w-3" />
                      Before
                    </div>
                    <ScrollArea className="h-24 w-full rounded border">
                      <div
                        className="p-2 text-xs bg-red-50 dark:bg-red-950/20"
                        dangerouslySetInnerHTML={{ __html: diff.before }}
                      />
                    </ScrollArea>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
                      <Plus className="h-3 w-3" />
                      After
                    </div>
                    <ScrollArea className="h-24 w-full rounded border">
                      <div
                        className="p-2 text-xs bg-green-50 dark:bg-green-950/20"
                        dangerouslySetInnerHTML={{ __html: diff.after }}
                      />
                    </ScrollArea>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={onAcceptAll} size="sm" className="flex-1 text-xs">
                      <Check className="mr-1 h-3 w-3" />
                      Accept Changes
                    </Button>
                    <Button
                      onClick={onRejectAll}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Revert to Original
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}
