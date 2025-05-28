import { SearchResult, SearchOptions } from './document-search'

export class ClientSearchService {
  private hasAICapability: boolean | null = null

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      console.log('ClientSearchService: Making search request with:', { query, options })
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, options }),
      })

      console.log('ClientSearchService: Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ClientSearchService: Error response:', errorText)
        throw new Error(`Search failed: ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('ClientSearchService: Search results:', data)
      return data.results || []
    } catch (error) {
      console.error('ClientSearchService: Search error:', error)
      // Don't throw the error, just return empty results so UI doesn't break
      return []
    }
  }

  async checkAICapability(): Promise<boolean> {
    if (this.hasAICapability !== null) {
      return this.hasAICapability
    }

    try {
      console.log('Checking AI capability...')
      const response = await fetch('/api/search')
      console.log('AI capability response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('AI capability response data:', data)
        this.hasAICapability = data.hasAI === true
        return this.hasAICapability
      } else {
        console.error('AI capability check failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error checking AI capability:', error)
    }

    this.hasAICapability = false
    return this.hasAICapability
  }

  // Reset capability check (useful for testing)
  resetCapabilityCheck(): void {
    this.hasAICapability = null
  }
} 