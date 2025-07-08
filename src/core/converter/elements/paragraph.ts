/**
 * Paragraph converter
 */

import { MarkdownBuilder } from '../markdown-builder.js';
import type { ElementLike } from '@/types/dom.js';
import { NodeType } from '@/types/dom.js';

export function convertParagraph(element: ElementLike, builder: MarkdownBuilder): void {
  const text = extractParagraphText(element).trim();
  
  if (text) {
    builder.addParagraph(text);
  }
}

/**
 * Extract text from paragraph, handling inline elements
 */
function extractParagraphText(element: ElementLike): string {
  let text = '';
  
  const childNodes = Array.isArray(element.childNodes) ? element.childNodes : Array.from(element.childNodes);
  
  for (const node of childNodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === NodeType.ELEMENT_NODE) {
      const childElement = node as ElementLike;
      const tagName = childElement.tagName.toLowerCase();
      
      switch (tagName) {
        case 'strong':
        case 'b':
          text += `**${extractParagraphText(childElement)}**`;
          break;
          
        case 'em':
        case 'i':
          text += `_${extractParagraphText(childElement)}_`;
          break;
          
        case 'code':
          text += `\`${childElement.textContent || ''}\``;
          break;
          
        case 'a': {
          const href = childElement.getAttribute('href');
          const linkText = extractParagraphText(childElement);
          text += href ? `[${linkText}](${href})` : linkText;
          break;
        }
          
        case 'br':
          text += '  \n';
          break;
          
        default:
          text += extractParagraphText(childElement);
      }
    }
  }
  
  return text;
}