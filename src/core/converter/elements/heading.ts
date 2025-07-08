/**
 * Heading converter (h1-h6)
 */

import { MarkdownBuilder } from '../markdown-builder.js';
import type { ElementLike } from '@/types/dom.js';
import { NodeType } from '@/types/dom.js';

export function convertHeading(element: ElementLike, builder: MarkdownBuilder): void {
  const tagName = element.tagName.toLowerCase();
  const level = parseInt(tagName.charAt(1), 10);
  
  // Get text content, removing any nested tags
  const text = getTextContent(element).trim();
  
  if (text) {
    builder.addHeading(level, text);
  }
}

/**
 * Extract clean text content from element
 */
function getTextContent(element: ElementLike): string {
  let text = '';
  
  // Handle null/undefined childNodes
  if (!element.childNodes) {
    return element.textContent || '';
  }
  
  const childNodes = Array.isArray(element.childNodes) ? element.childNodes : Array.from(element.childNodes);
  
  for (const node of childNodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === NodeType.ELEMENT_NODE) {
      // Recursively get text from child elements
      text += getTextContent(node as ElementLike);
    }
  }
  
  return text;
}