/**
 * Sanitize HTML content for safe rendering with dangerouslySetInnerHTML.
 * Uses DOMPurify in the browser. On SSR, returns the input with basic tag stripping.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''

  // On server-side, do basic tag stripping (DOMPurify needs window)
  if (typeof window === 'undefined') {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '')
  }

  // Client-side: use DOMPurify for full sanitization
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const DOMPurify = require('dompurify')
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
  })
}
