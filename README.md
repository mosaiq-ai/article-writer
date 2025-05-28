# Article Writer - AI-Powered Document Editor

An advanced LLM-powered document editor with agentic document creation capabilities. Built with modern web technologies and designed for creating high-quality, grounded documents from source materials.

## 🚀 Features

- **Modern Tech Stack**: Next.js 15.3, React 19, TypeScript, Tailwind CSS
- **AI Integration Ready**: Prepared for Vercel AI SDK 4.2, multiple LLM providers
- **Rich UI Components**: shadcn/ui v4 with comprehensive component library
- **Quality Assurance**: ESLint, Prettier, Vitest testing, pre-commit hooks
- **Responsive Design**: Mobile-first approach with dark mode support
- **Type Safety**: Strict TypeScript configuration with comprehensive type checking

## 🛠️ Tech Stack

### Frontend

- **Next.js 15.3** with App Router and Turbopack
- **React 19** with latest features
- **TypeScript** with strict configuration
- **Tailwind CSS v4** for styling
- **shadcn/ui v4** for UI components

### Development Tools

- **ESLint 9** with TypeScript rules
- **Prettier** for code formatting
- **Vitest** for testing with React Testing Library
- **Husky** for git hooks
- **lint-staged** for pre-commit quality checks

### Planned Integrations

- **Vercel AI SDK 4.2** for AI model integration
- **Tiptap 3.0** for rich text editing
- **Vector databases** (Pinecone/Chroma) for semantic search
- **LangChain.js** for agentic workflows

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd article-writer
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

## 🧪 Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run tests with Vitest
- `pnpm test:ui` - Run tests with UI
- `pnpm test:coverage` - Run tests with coverage

## 📁 Project Structure

```
article-writer/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/         # Authentication routes
│   │   ├── (dashboard)/    # Dashboard routes
│   │   └── api/            # API routes
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── editor/         # Editor components
│   │   ├── ai/             # AI-related components
│   │   └── layout/         # Layout components
│   ├── lib/                # Utility libraries
│   │   ├── ai/             # AI utilities
│   │   ├── db/             # Database utilities
│   │   ├── utils/          # General utilities
│   │   └── hooks/          # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   └── styles/             # Global styles and typography
├── tests/                  # Test files and setup
└── docs/                   # Documentation
```

## 🎨 UI Components

The project uses shadcn/ui v4 with the following components already installed:

- Button, Input, Card, Dialog
- Dropdown Menu, Form, Label, Select
- Separator, Skeleton, Sonner (Toast), Tooltip

### Typography System

Custom typography classes are available:

- `h1`, `h2`, `h3`, `h4` - Semantic headings
- `p` - Paragraph with proper spacing
- `blockquote` - Styled quotes
- `code` - Inline code blocks

## 🔧 Configuration

### TypeScript

- Strict mode enabled
- Custom path mappings configured
- ES2022 target with modern features

### ESLint

- Next.js recommended rules
- TypeScript-specific rules
- Prettier integration

### Tailwind CSS

- v4 configuration
- Custom design tokens
- Dark mode support
- Typography utilities

## 🧪 Testing

The project uses Vitest with React Testing Library:

- **Unit Tests**: Component testing with jsdom
- **Integration Tests**: Ready for API and workflow testing
- **Coverage**: Available with `pnpm test:coverage`

Example test structure:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })
})
```

## 🚀 Development Workflow

1. **Code Quality**: Pre-commit hooks ensure code quality
2. **Type Safety**: TypeScript strict mode catches errors early
3. **Testing**: Comprehensive test suite with good coverage
4. **Formatting**: Automatic code formatting with Prettier
5. **Linting**: ESLint catches potential issues

## 📋 Phase 1 Completion Status

✅ **Completed Features:**

- [x] Next.js 15.3 project setup with App Router
- [x] TypeScript strict configuration
- [x] shadcn/ui v4 component library
- [x] Tailwind CSS v4 styling system
- [x] ESLint and Prettier configuration
- [x] Vitest testing setup
- [x] Pre-commit hooks with Husky
- [x] Project structure and documentation
- [x] Basic layout and navigation
- [x] Typography system

🚧 **Next Phase (AI Integration):**

- [ ] Vercel AI SDK 4.2 integration
- [ ] Multiple LLM provider setup
- [ ] Tiptap 3.0 rich text editor
- [ ] Vector database integration
- [ ] Agentic workflow implementation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vitest Documentation](https://vitest.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables (optional for AI features):**
   Create a `.env.local` file in the root directory:
   ```bash
   # AI Provider API Keys (optional - enables AI-powered search)
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here  
   GOOGLE_AI_API_KEY=your_google_ai_api_key_here
   ```

3. **Start the development server:**
   ```bash
   pnpm dev
   ```

4. **Open the editor:**
   Navigate to http://localhost:3000/editor (or the port shown in terminal)

## Features

### ✅ Phase 3.3 - Document Search & Reference System

- **Hybrid Search**: Combines keyword and AI-powered semantic search
- **Document Management**: Upload and search across multiple documents  
- **Citation System**: Professional citation management (APA, MLA, Chicago)
- **Cross-References**: Automatic numbering and linking of headings, figures, tables
- **Rich Text Editor**: Tiptap-powered editor with AI enhancements

### 🔧 AI Features

The application works without API keys using keyword search only. To enable AI-powered features:

1. **OpenAI**: Get API key from https://platform.openai.com/api-keys
2. **Anthropic**: Get API key from https://console.anthropic.com/
3. **Google AI**: Get API key from https://aistudio.google.com/app/apikey

Add any one or more API keys to `.env.local` to enable:
- AI-powered semantic search
- Intelligent document analysis
- Content generation assistance

### 🎯 Testing the Search

The app includes test documents for immediate testing:
- "Introduction to Machine Learning"
- "React Development Best Practices" 
- "Database Design Principles"

Try searching for: "machine learning", "react", "database", "javascript"

## Architecture

- **Frontend**: Next.js 15.3 with React 19
- **Editor**: Tiptap 3.0 with ProseMirror
- **AI**: Vercel AI SDK 4.2 with multi-provider support
- **UI**: shadcn/ui with Tailwind CSS
- **Search**: Hybrid keyword + semantic search

## Development Status

- ✅ Phase 1: Foundation Setup
- ✅ Phase 2: AI Integration  
- ✅ Phase 3.1: Tiptap Editor Integration
- ✅ Phase 3.2: AI-Powered Text Selection & Editing
- ✅ Phase 3.3: Document Search & Reference System
- 🚧 Phase 3.4: Agentic Document Generation Interface (Next)

## Contributing

This is an internal tool for advanced document creation with AI assistance. See the phase documentation in the project for detailed implementation notes.
