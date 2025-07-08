/**
 * Simple test element creator that satisfies ElementLike interface
 */

import type { ElementLike } from '@/types/dom.js';

export function createTestElement(overrides: Partial<ElementLike> & { 
  tagName: string; 
  textContent?: string | null;
}): ElementLike {
  const defaults: ElementLike = {
    // Required properties
    tagName: overrides.tagName,
    innerHTML: '',
    outerHTML: '',
    textContent: overrides.textContent ?? '',
    children: [],
    attributes: { length: 0 },
    
    // Node properties
    nodeType: 1,
    nodeName: overrides.tagName.toUpperCase(),
    nodeValue: null,
    parentNode: null,
    parentElement: null,
    childNodes: [],
    firstChild: null,
    lastChild: null,
    previousSibling: null,
    nextSibling: null,
    
    // Methods with default implementations
    getAttribute: () => null,
    setAttribute: () => {},
    removeAttribute: () => {},
    hasAttribute: () => false,
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: (node) => node,
    removeChild: (node) => node,
    replaceChild: (newChild) => newChild,
    insertBefore: (newChild) => newChild,
    cloneNode: function() { return this; },
    contains: () => false,
    hasChildNodes: () => false,
    closest: () => null,
    matches: () => false,
  };
  
  return { ...defaults, ...overrides } as ElementLike;
}