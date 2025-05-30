/**
 * Simple HTML sanitizer for AI-generated content
 * Allows safe HTML tags while removing potentially dangerous ones
 */

/**
 * Sanitize HTML content by removing dangerous tags and attributes
 * while preserving formatting tags safe for rich text editing
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")

  // Remove style tags and their content (but preserve inline styles on safe elements)
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")

  // Remove dangerous event handler attributes
  html = html.replace(/\s(on\w+|javascript:|data:)[\s]*=[\s]*['""][^'"]*['"]/gi, "")

  // Remove form elements
  html = html.replace(/<\/?(?:form|input|textarea|select|option|button)\b[^>]*>/gi, "")

  // Remove dangerous tags but keep all formatting tags
  html = html.replace(
    /<\/?(?:script|style|link|meta|iframe|object|embed|applet|base|head|html|body|title)\b[^>]*>/gi,
    ""
  )

  return html
}

/**
 * Clean and validate HTML for Tiptap editor insertion
 * Be very conservative to preserve exact formatting
 */
export function prepareHtmlForEditor(html: string): string {
  // Sanitize the HTML (remove dangerous content only)
  const sanitized = sanitizeHtml(html)

  // Just trim whitespace and return - don't modify structure at all
  const cleaned = sanitized.trim()

  // Only add paragraph tags if the content is completely plain text (no HTML at all)
  if (cleaned && !cleaned.includes("<") && !cleaned.includes(">")) {
    return `<p>${cleaned}</p>`
  }

  // For all other cases, preserve the HTML structure exactly as provided
  return cleaned
}
