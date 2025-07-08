/**
 * Link converter
 */

import { MarkdownBuilder } from '../markdown-builder.js';
import { sanitizeUrl } from '@/core/security/sanitizer.js';
import type { ElementLike } from '@/types/dom.js';

export function convertLink(element: ElementLike, builder: MarkdownBuilder): void {
  const href = element.getAttribute('href');
  const text = element.textContent?.trim() || '';
  
  if (!text) {
    return;
  }
  
  if (!href) {
    // No href, just output the text
    builder.add(text);
    return;
  }
  
  // Sanitize the URL
  const safeUrl = sanitizeUrl(href);
  
  if (!safeUrl) {
    // Dangerous URL, just output the text
    builder.add(text);
    return;
  }
  
  // Build markdown link
  builder.add(`[${escapeMarkdownInLink(text)}](${safeUrl})`);
}

/**
 * Escape special characters in link text
 */
function escapeMarkdownInLink(text: string): string {
  // In link text, we need to escape [ and ]
  return text.replace(/([[\]])/g, '\\$1');
}