import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="mb-4">Welcome to Article Writer</h1>
          <p className="text-xl text-muted-foreground mb-8">
            An AI-powered document editor for creating high-quality, grounded articles from source
            materials.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg">Create New Document</Button>
            <Button variant="outline" size="lg">
              Browse Templates
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Writing</CardTitle>
              <CardDescription>
                Leverage multiple AI models to create compelling content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Integrate with GPT-4, Claude, and Gemini for diverse writing styles and
                capabilities.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rich Text Editor</CardTitle>
              <CardDescription>Modern editing experience with Tiptap</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Professional-grade editor with AI assistance, collaborative features, and extensible
                plugins.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Source Grounding</CardTitle>
              <CardDescription>Fact-based content with proper attribution</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Vector search and document processing ensure your content is grounded in reliable
                sources.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="mb-4">Project Status</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <h3 className="text-green-800 dark:text-green-200 font-semibold">
                ✅ Phase 1 Complete
              </h3>
              <p className="text-green-600 dark:text-green-300 text-sm">
                Foundation setup with Next.js 15.3, TypeScript, shadcn/ui, and testing
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h3 className="text-blue-800 dark:text-blue-200 font-semibold">
                🚧 Next: AI Integration
              </h3>
              <p className="text-blue-600 dark:text-blue-300 text-sm">
                Phase 2: Vercel AI SDK, LLM providers, and agentic workflows
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
