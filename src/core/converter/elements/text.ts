/**
 * Text node converter
 */

import type { TextLike } from '@/types/dom.js';
import { MarkdownBuilder } from '../markdown-builder.js';

export function convertText(node: TextLike, builder: MarkdownBuilder): void {
  const text = node.textContent || '';
  
  // For completely empty text nodes, skip them
  if (text === '') {
    return;
  }

  // Add the text as-is, preserving all whitespace
  builder.add(text);
}

// Note: Text content is preserved as-is without escaping.
// Markdown escaping should only be done in specific contexts where needed,
// not for general text content within HTML elements.