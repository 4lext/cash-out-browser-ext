/**
 * List converter (ul/ol)
 */

import { MarkdownBuilder } from '../markdown-builder.js';
import type { ElementLike } from '@/types/dom.js';
import { NodeType } from '@/types/dom.js';

export function convertList(element: ElementLike, builder: MarkdownBuilder): void {
  const tagName = element.tagName.toLowerCase();
  
  // If this is a list item, just process its content
  if (tagName === 'li') {
    // This shouldn't happen in normal flow, but handle it gracefully
    const text = getListItemText(element).trim();
    if (text) {
      builder.addLine(text);
    }
    return;
  }
  
  const isOrdered = tagName === 'ol';
  // Get direct children only
  const items: ElementLike[] = [];
  const children = Array.isArray(element.children) ? element.children : Array.from(element.children);
  for (const child of children) {
    if (child.tagName.toLowerCase() === 'li') {
      items.push(child);
    }
  }

  if (items.length === 0) {
    return;
  }

  // Only add blank line before/after for top-level lists
  const isTopLevel = builder.indentLevel === 0;
  if (isTopLevel) builder.addBlankLine();

  let itemNumber = 1;

  for (const item of items) {
    // Get text content excluding nested lists
    const text = getListItemText(item).trim();
    if (text) {
      builder.addListItem(text, isOrdered, itemNumber);
    }
    
    // Process nested lists
    const itemChildren = Array.isArray(item.children) ? item.children : Array.from(item.children);
    for (const child of itemChildren) {
      const childTag = child.tagName.toLowerCase();
      if (childTag === 'ul' || childTag === 'ol') {
        builder.indent(2);
        convertList(child as ElementLike, builder);
        builder.outdent(2);
      }
    }
    
    itemNumber++;
  }

  if (isTopLevel) builder.addBlankLine();
}


/**
 * Extract text from list item, excluding nested lists
 */
function getListItemText(element: ElementLike): string {
  let text = '';

  const childNodes = Array.isArray(element.childNodes) ? element.childNodes : Array.from(element.childNodes);
  for (const node of childNodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === NodeType.ELEMENT_NODE) {
      const childElement = node as ElementLike;
      const tagName = childElement.tagName.toLowerCase();

      // Skip nested lists
      if (tagName === 'ul' || tagName === 'ol') {
        continue;
      }

      // Handle inline elements
      switch (tagName) {
        case 'strong':
        case 'b':
          text += `**${getListItemText(childElement)}**`;
          break;

        case 'em':
        case 'i':
          text += `_${getListItemText(childElement)}_`;
          break;

        case 'code':
          text += `\`${childElement.textContent || ''}\``;
          break;

        case 'a': {
          const href = childElement.getAttribute('href');
          const linkText = getListItemText(childElement);
          text += href ? `[${linkText}](${href})` : linkText;
          break;
        }

        default:
          text += getListItemText(childElement);
      }
    }
  }

  return text;
}
