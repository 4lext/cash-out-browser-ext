/**
 * Image converter
 */

import { MarkdownBuilder } from '../markdown-builder.js';
import { sanitizeUrl } from '@/core/security/sanitizer.js';
import type { ElementLike } from '@/types/dom.js';

export function convertImage(element: ElementLike, builder: MarkdownBuilder): void {
  const src = element.getAttribute('src');
  const alt = element.getAttribute('alt') || '';
  const title = element.getAttribute('title');
  
  if (!src) {
    return;
  }
  
  // Sanitize the URL
  const safeSrc = sanitizeUrl(src);
  
  if (!safeSrc) {
    // Dangerous URL, output description instead
    if (alt) {
      builder.add(`[Image: ${alt}]`);
    }
    return;
  }
  
  // Build markdown image
  let markdown = `![${escapeAltText(alt)}](${safeSrc}`;
  
  // Add title if present
  if (title) {
    markdown += ` "${escapeTitle(title)}"`;
  }
  
  markdown += ')';
  
  builder.add(markdown);
}

/**
 * Escape special characters in alt text
 */
function escapeAltText(text: string): string {
  // In alt text, we need to escape [ and ]
  return text.replace(/([[\]])/g, '\\$1');
}

/**
 * Escape special characters in title
 */
function escapeTitle(text: string): string {
  // In title, we need to escape quotes
  return text.replace(/"/g, '\\"');
}