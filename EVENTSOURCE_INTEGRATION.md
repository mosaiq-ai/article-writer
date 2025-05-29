# EventSource Integration for Real-time Agent Flow Updates

This document explains the new EventSource integration that provides real-time updates for agent flow execution.

## Overview

The system now supports real-time streaming of agent state updates using Server-Sent Events (SSE). This allows the frontend to display live progress updates as agents execute their tasks.

## Architecture

### Backend Components

1. **FlowManager Singleton** (`/lib/agents/flow-manager.ts`)

   - Manages all active flows with shared state
   - Provides async generators for streaming updates
   - Handles flow lifecycle (start, pause, resume, retry, cancel)

2. **Streaming API Endpoints**
   - `/api/agents/flow/stream` - Start new flows with streaming
   - `/api/agents/flow/stream?id=<flowId>` - Connect to existing flows
   - `/api/agents/flow/[id]/pause` - Pause flows
   - `/api/agents/flow/[id]/resume` - Resume flows
   - `/api/agents/flow/[id]/retry` - Retry failed flows

### Frontend Components

1. **useAgentFlow Hook** (`/hooks/use-agent-flow.ts`)

   - React hook for managing flow state and EventSource connections
   - Handles automatic reconnection and error recovery
   - Provides callbacks for progress, completion, and errors

2. **AgentProgressDashboard** (`/components/editor/AgentProgressDashboard.tsx`)

   - Real-time UI for displaying agent progress
   - Shows individual agent status and outputs
   - Supports flow control actions (pause, resume, retry)

3. **DocumentCreationWizard** (`/components/editor/DocumentCreationWizard.tsx`)
   - Updated to use streaming flows instead of waiting for completion
   - Provides smooth user experience with real-time feedback

## Usage Examples

### Using the Hook Directly

```typescript
import { useAgentFlow } from '@/hooks/use-agent-flow'

function MyComponent() {
  const { startFlow, flowState, isLoading, error } = useAgentFlow({
    onComplete: (document) => {
      console.log('Document ready:', document)
    },
    onError: (error) => {
      console.error('Flow failed:', error)
    },
    onProgress: (progress, currentAgent) => {
      console.log(`${progress}% - ${currentAgent}`)
    },
  })

  const handleStart = async () => {
    await startFlow({
      goal: 'Create a technical guide',
      documentIds: ['doc1', 'doc2'],
      style: 'professional',
      preferredModel: 'claude-4-sonnet',
    })
  }

  return (
    <div>
      <button onClick={handleStart} disabled={isLoading}>
        Start Flow
      </button>
      {flowState && <p>Progress: {flowState.progress}%</p>}
      {error && <p>Error: {error}</p>}
    </div>
  )
}
```

### Using with Progress Dashboard

```typescript
import { AgentProgressDashboard } from '@/components/editor/AgentProgressDashboard'

function FlowMonitor({ flowId }: { flowId: string }) {
  return (
    <AgentProgressDashboard
      flowId={flowId}
      onComplete={(document) => {
        // Handle completed document
      }}
    />
  )
}
```

### Using the Document Creation Wizard

```typescript
import { DocumentCreationWizard } from '@/components/editor/DocumentCreationWizard'

function DocumentEditor() {
  const [showWizard, setShowWizard] = useState(false)

  return (
    <>
      <button onClick={() => setShowWizard(true)}>
        Create Document
      </button>

      <DocumentCreationWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onFlowStart={(flowId) => {
          console.log('Flow started:', flowId)
        }}
        onDocumentCreated={(document) => {
          // Handle the created document
        }}
      />
    </>
  )
}
```

## API Endpoints

### Start Streaming Flow

```
POST /api/agents/flow/stream
Content-Type: application/json

{
  "goal": "Create a technical guide",
  "documentIds": ["doc1", "doc2"],
  "style": "professional",
  "preferredModel": "claude-4-sonnet",
  "constraints": ["Target length: medium"]
}

Response: Server-Sent Events stream
data: {"id":"flow123","status":"running","progress":25,"currentAgent":"Document Intake Agent",...}
data: {"id":"flow123","status":"running","progress":50,"currentAgent":"Outline Architect Agent",...}
data: {"id":"flow123","status":"completed","progress":100,...}
```

### Connect to Existing Flow

```
GET /api/agents/flow/stream?id=flow123

Response: Server-Sent Events stream with current state
```

### Flow Control

```
POST /api/agents/flow/flow123/pause
POST /api/agents/flow/flow123/resume
POST /api/agents/flow/flow123/retry (returns SSE stream)
```

## Flow States

- `pending` - Flow is queued but not started
- `running` - Flow is actively executing agents
- `completed` - Flow finished successfully
- `failed` - Flow encountered an error
- `paused` - Flow was paused by user

## Error Handling

The system includes comprehensive error handling:

1. **Connection Errors**: Automatic reconnection attempts
2. **Agent Failures**: Flow stops and reports specific error
3. **Network Issues**: Graceful degradation with fallback options
4. **Timeout Handling**: Configurable timeouts for agent execution

## Performance Considerations

1. **Memory Management**: Old flows are automatically cleaned up
2. **Connection Limits**: EventSource connections are properly closed
3. **Bandwidth Optimization**: Only essential state is streamed
4. **Error Recovery**: Failed connections are automatically retried

## Development and Testing

To test the integration:

1. Start the development server: `cd article-writer && pnpm dev`
2. Navigate to the StreamingFlowExample component
3. Use either the example flow or document creation wizard
4. Monitor browser console for real-time updates
5. Check Network tab for SSE connections

## Troubleshooting

### Common Issues

1. **No real-time updates**: Check that the EventSource connection is established
2. **Flow not starting**: Verify document IDs are valid
3. **Connection drops**: Check network stability and server logs
4. **Memory leaks**: Ensure components properly cleanup EventSource connections

### Debug Tools

- Browser DevTools > Network > EventStream
- Server console logs for flow progress
- React DevTools for component state
- `/api/agents/flow` GET endpoint for flow statistics

## Future Enhancements

- WebSocket fallback for better real-time performance
- Flow scheduling and queueing system
- Advanced error recovery and retry strategies
- Flow templates and presets
- Real-time collaborative editing integration
