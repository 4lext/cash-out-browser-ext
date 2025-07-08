/**
 * Blockquote converter
 */

import { MarkdownBuilder } from '../markdown-builder.js';
import type { ElementLike, NodeLike } from '@/types/dom.js';
import { NodeType } from '@/types/dom.js';

export function convertBlockquote(element: ElementLike, builder: MarkdownBuilder): void {
  const text = extractBlockquoteText(element).trim();
  
  if (text) {
    builder.addBlockquote(text);
  }
}

/**
 * Extract text from blockquote, preserving structure
 */
function extractBlockquoteText(element: ElementLike): string {
  const lines: string[] = [];
  let currentLine = '';
  
  function processNode(node: NodeLike): void {
    if (node.nodeType === NodeType.TEXT_NODE) {
      currentLine += node.textContent || '';
    } else if (node.nodeType === NodeType.ELEMENT_NODE) {
      const childElement = node as ElementLike;
      const tagName = childElement.tagName.toLowerCase();
      
      switch (tagName) {
        case 'p':
          // New paragraph in blockquote
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = '';
          processChildren(childElement);
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = '';
          break;
          
        case 'br':
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = '';
          break;
          
        case 'strong':
        case 'b':
          currentLine += '**';
          processChildren(childElement);
          currentLine += '**';
          break;
          
        case 'em':
        case 'i':
          currentLine += '_';
          processChildren(childElement);
          currentLine += '_';
          break;
          
        case 'code':
          currentLine += `\`${childElement.textContent || ''}\``;
          break;
          
        default:
          processChildren(childElement);
      }
    }
  }
  
  function processChildren(element: ElementLike): void {
    const childNodes = Array.isArray(element.childNodes) ? element.childNodes : Array.from(element.childNodes);
    for (const child of childNodes) {
      processNode(child);
    }
  }
  
  processChildren(element);
  
  // Add any remaining text
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines.join('\n');
}