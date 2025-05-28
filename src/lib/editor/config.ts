import StarterKit from "@tiptap/starter-kit"
import Highlight from "@tiptap/extension-highlight"
import Typography from "@tiptap/extension-typography"
import Placeholder from "@tiptap/extension-placeholder"
import CharacterCount from "@tiptap/extension-character-count"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import { Color } from "@tiptap/extension-color"
import TextStyle from "@tiptap/extension-text-style"

export const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    codeBlock: {
      languageClassPrefix: "language-",
    },
  }),
  Highlight.configure({
    multicolor: true,
  }),
  Typography,
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        return `Heading ${node.attrs.level}`
      }
      return "Start writing your document..."
    },
  }),
  CharacterCount.configure({
    limit: null,
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  TextStyle,
  Color,
]

export interface EditorConfig {
  autofocus: boolean
  editable: boolean
  injectCSS: boolean
  extensions: unknown[]
}

export const defaultEditorConfig: EditorConfig = {
  autofocus: true,
  editable: true,
  injectCSS: true,
  extensions: editorExtensions,
}

export function parseHTML() {
  return [
    {
      tag: "span[data-citation]",
      getAttrs: (node: Element | string) => {
        if (typeof node === "string") return false
        return {
          id: node.getAttribute("data-citation-id"),
          title: node.getAttribute("data-citation-title"),
          url: node.getAttribute("data-citation-url"),
        }
      },
    },
  ]
}
