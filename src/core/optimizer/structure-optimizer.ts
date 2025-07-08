/**
 * Structure optimizer for LLM-friendly output
 */

import type { ElementLike, NodeLike, DocumentLike } from '@/types/dom.js';

export interface OptimizationOptions {
  maxNestingDepth?: number;
  flattenLists?: boolean;
  normalizeHeadings?: boolean;
  removeRedundantFormatting?: boolean;
  mergeAdjacentElements?: boolean;
}

export class StructureOptimizer {
  private options: Required<OptimizationOptions>;

  constructor(options: OptimizationOptions = {}) {
    this.options = {
      maxNestingDepth: options.maxNestingDepth ?? 3,
      flattenLists: options.flattenLists ?? true,
      normalizeHeadings: options.normalizeHeadings ?? true,
      removeRedundantFormatting: options.removeRedundantFormatting ?? true,
      mergeAdjacentElements: options.mergeAdjacentElements ?? true,
    };
  }

  /**
   * Optimize document structure for LLM consumption
   */
  optimizeStructure(element: ElementLike): void {
    if (this.options.normalizeHeadings) {
      this.normalizeHeadingHierarchy(element);
    }

    if (this.options.removeRedundantFormatting) {
      this.removeRedundantFormatting(element);
    }

    if (this.options.flattenLists) {
      this.flattenDeeplyNestedLists(element);
    }

    if (this.options.mergeAdjacentElements) {
      this.mergeAdjacentTextNodes(element);
      this.mergeAdjacentParagraphs(element);
    }

    this.flattenDeeplyNestedElements(element);
  }

  /**
   * Normalize heading hierarchy (no h1→h3 jumps)
   */
  private normalizeHeadingHierarchy(element: ElementLike): void {
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingsArray = Array.isArray(headings) ? headings : Array.from(headings);
    if (headingsArray.length === 0) return;

    let lastLevel = 0;

    for (const heading of headingsArray) {
      const headingElement = heading as ElementLike;
      const currentLevel = parseInt(headingElement.tagName.charAt(1), 10);
      
      // Fix heading hierarchy jumps
      if (lastLevel > 0 && currentLevel > lastLevel + 1) {
        const newLevel = lastLevel + 1;
        const newTag = `H${newLevel}`;
        
        // Create new heading element
        const newHeading = this.createElement(element, newTag.toLowerCase());
        
        // Transfer all attributes
        if (headingElement.attributes) {
          const attrs = headingElement.attributes;
          for (let i = 0; i < attrs.length; i++) {
            const attr = attrs[i];
            if (attr) {
              newHeading.setAttribute(attr.name, attr.value);
            }
          }
        }
        
        // Transfer all child nodes
        while (headingElement.firstChild) {
          newHeading.appendChild(headingElement.firstChild);
        }
        
        // Replace the old heading
        headingElement.parentElement?.replaceChild(newHeading, headingElement);
        
        lastLevel = newLevel;
      } else {
        lastLevel = currentLevel;
      }
    }
  }

  /**
   * Remove redundant formatting (e.g., bold headers)
   */
  private removeRedundantFormatting(element: ElementLike): void {
    // Remove bold/strong from headings
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingsArray = Array.isArray(headings) ? headings : Array.from(headings);
    
    for (const heading of headingsArray) {
      const headingElement = heading as ElementLike;
      const formattingElements = headingElement.querySelectorAll('strong, b');
      const formattingArray = Array.isArray(formattingElements) ? formattingElements : Array.from(formattingElements);
      
      for (const format of formattingArray) {
        const formatElement = format as ElementLike;
        // Move all child nodes up to parent
        while (formatElement.firstChild) {
          formatElement.parentElement?.insertBefore(formatElement.firstChild, formatElement);
        }
        formatElement.parentElement?.removeChild(formatElement);
      }
      
      // Remove em/i only if they're the only child and contain all the heading text
      const italicElements = headingElement.querySelectorAll('em, i');
      const italicArray = Array.isArray(italicElements) ? italicElements : Array.from(italicElements);
      
      for (const italic of italicArray) {
        const italicElement = italic as ElementLike;
        if (italicElement.parentElement === headingElement && 
            headingElement.childNodes.length === 1) {
          while (italicElement.firstChild) {
            headingElement.insertBefore(italicElement.firstChild, italicElement);
          }
          headingElement.removeChild(italicElement);
        }
      }
    }

    // Remove nested formatting of the same type
    this.removeNestedFormatting(element);
  }

  /**
   * Remove nested formatting of the same type
   */
  private removeNestedFormatting(element: ElementLike): void {
    // Remove nested strong/b
    const nestedStrongs = element.querySelectorAll('strong strong, strong b, b strong, b b');
    const nestedStrongsArray = Array.isArray(nestedStrongs) ? nestedStrongs : Array.from(nestedStrongs);
    
    for (const nested of nestedStrongsArray) {
      const nestedElement = nested as ElementLike;
      // Move children up and remove the nested element
      while (nestedElement.firstChild) {
        nestedElement.parentElement?.insertBefore(nestedElement.firstChild, nestedElement);
      }
      nestedElement.parentElement?.removeChild(nestedElement);
    }
    
    // Remove nested em/i
    const nestedItalics = element.querySelectorAll('em em, em i, i em, i i');
    const nestedItalicsArray = Array.isArray(nestedItalics) ? nestedItalics : Array.from(nestedItalics);
    
    for (const nested of nestedItalicsArray) {
      const nestedElement = nested as ElementLike;
      // Move children up and remove the nested element
      while (nestedElement.firstChild) {
        nestedElement.parentElement?.insertBefore(nestedElement.firstChild, nestedElement);
      }
      nestedElement.parentElement?.removeChild(nestedElement);
    }
  }

  /**
   * Flatten deeply nested lists beyond max depth
   */
  private flattenDeeplyNestedLists(element: ElementLike): void {
    // Find all lists and process from deepest to shallowest
    const lists = element.querySelectorAll('ul, ol');
    const listsArray = Array.isArray(lists) ? lists : Array.from(lists);
    
    // Sort by depth (deepest first)
    const sortedLists = listsArray.sort((a, b) => {
      return this.getListNestingDepth(b as ElementLike) - this.getListNestingDepth(a as ElementLike);
    });
    
    for (const list of sortedLists) {
      const listElement = list as ElementLike;
      const depth = this.getListNestingDepth(listElement);
      
      if (depth > this.options.maxNestingDepth) {
        // Find the parent list item
        let parentLi = listElement.parentElement;
        while (parentLi && parentLi.tagName !== 'LI') {
          parentLi = parentLi.parentElement;
        }
        
        if (parentLi) {
          // Move all list items from the nested list to after the parent LI
          const items = listElement.querySelectorAll(':scope > li');
          const itemsArray = Array.isArray(items) ? items : Array.from(items);
          
          for (const item of itemsArray) {
            const li = item as ElementLike;
            // Insert after parent LI
            if (parentLi.nextSibling) {
              parentLi.parentElement?.insertBefore(li, parentLi.nextSibling);
            } else {
              parentLi.parentElement?.appendChild(li);
            }
          }
          
          // Remove the now-empty nested list
          listElement.parentElement?.removeChild(listElement);
        }
      }
    }
  }

  /**
   * Get the nesting depth of a list
   */
  private getListNestingDepth(list: ElementLike): number {
    let depth = 0;
    let current: ElementLike | null = list;
    
    while (current) {
      if (current.tagName === 'UL' || current.tagName === 'OL') {
        depth++;
      }
      current = current.parentElement;
    }
    
    return depth;
  }


  /**
   * Flatten deeply nested div/section elements
   */
  private flattenDeeplyNestedElements(element: ElementLike): void {
    let modified = true;
    while (modified) {
      modified = false;
      
      const containers = element.querySelectorAll('div, section');
      const containersArray = Array.isArray(containers) ? containers : Array.from(containers);
      
      for (const container of containersArray) {
        const containerElement = container as ElementLike;
        const depth = this.getElementNestingDepth(containerElement);
        
        if (depth > this.options.maxNestingDepth) {
          const parent = containerElement.parentElement;
          if (parent && ['DIV', 'SECTION'].includes(parent.tagName)) {
            // Move all children of the deeply nested element to its parent
            while (containerElement.firstChild) {
              parent.insertBefore(containerElement.firstChild, containerElement);
            }
            
            // Remove the now-empty container
            parent.removeChild(containerElement);
            modified = true;
            break; // Restart the process
          }
        }
      }
    }
  }

  /**
   * Get nesting depth of an element
   */
  private getElementNestingDepth(element: ElementLike): number {
    let depth = 1; // Start at 1 to include the element itself
    let parent = element.parentElement;
    
    while (parent && depth < 10) {
      if (['DIV', 'SECTION'].includes(parent.tagName)) {
        depth++;
      }
      parent = parent.parentElement;
    }
    
    return depth;
  }

  /**
   * Create an element in the same document context
   */
  private createElement(contextElement: ElementLike, tagName: string): ElementLike {
    // Try to get a document from the context
    let current: NodeLike | null = contextElement;
    while (current) {
      if ('createElement' in current && typeof (current as unknown as DocumentLike).createElement === 'function') {
        return (current as unknown as DocumentLike).createElement(tagName);
      }
      current = current.parentNode;
    }
    
    // If we can't find a document, use the global document if available
    if (typeof document !== 'undefined') {
      return document.createElement(tagName) as unknown as ElementLike;
    }
    
    // As a last resort, create a minimal element-like object
    throw new Error('Unable to create element: no document context found');
  }

  /**
   * Merge adjacent text nodes
   */
  private mergeAdjacentTextNodes(element: ElementLike): void {
    this.mergeTextNodesRecursive(element);
  }

  /**
   * Recursively merge text nodes in an element and its children
   */
  private mergeTextNodesRecursive(element: ElementLike): void {
    // Process child elements first
    const children = Array.from(element.children || []);
    for (const child of children) {
      this.mergeTextNodesRecursive(child as ElementLike);
    }
    
    // Merge adjacent text nodes at this level
    if (!element.childNodes) return;
    
    let i = 0;
    while (i < element.childNodes.length - 1) {
      const current = element.childNodes[i];
      const next = element.childNodes[i + 1];
      
      if (current && next && current.nodeType === 3 && next.nodeType === 3) { // Both are text nodes
        // Merge the text content
        current.textContent = (current.textContent || '') + (next.textContent || '');
        element.removeChild(next);
        // Stay at the same index to check for more adjacent text nodes
      } else {
        i++;
      }
    }
  }

  /**
   * Merge adjacent paragraphs that should be continuous
   */
  private mergeAdjacentParagraphs(element: ElementLike): void {
    let paragraphs = element.querySelectorAll('p');
    let paragraphsArray = Array.isArray(paragraphs) ? paragraphs : Array.from(paragraphs);
    
    let i = 0;
    while (i < paragraphsArray.length - 1) {
      const current = paragraphsArray[i] as ElementLike;
      const next = paragraphsArray[i + 1] as ElementLike;
      
      // Check if they're actually adjacent siblings
      // Skip if there's something between them
      let sibling = current.nextSibling;
      let isAdjacent = false;
      while (sibling) {
        if (sibling === next) {
          isAdjacent = true;
          break;
        }
        if (sibling.nodeType === 1) { // Element node
          break;
        }
        sibling = sibling.nextSibling;
      }
      
      if (!isAdjacent) {
        i++;
        continue;
      }
      
      const currentText = current.textContent?.trim() || '';
      const nextText = next.textContent?.trim() || '';
      
      if (currentText && nextText) {
        const lastChar = currentText.slice(-1);
        const firstChar = nextText.charAt(0);
        
        // Check if it looks like a continuation
        if (!['.', '!', '?', ':', ';'].includes(lastChar) && 
            firstChar === firstChar.toLowerCase()) {
          // Merge the paragraphs
          current.textContent = currentText + ' ' + nextText;
          next.parentElement?.removeChild(next);
          
          // Re-query paragraphs since we modified the DOM
          paragraphs = element.querySelectorAll('p');
          paragraphsArray = Array.isArray(paragraphs) ? paragraphs : Array.from(paragraphs);
          // Don't increment i, check the same position again
          continue;
        }
      }
      
      i++;
    }
  }
}