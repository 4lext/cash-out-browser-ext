/**
 * Mock element factory for testing
 */

import type { ElementLike, NodeLike, NodeListLike, HTMLCollectionLike, AttributeLike, NamedNodeMapLike } from '@/types/dom.js';
import { NodeType } from '@/types/dom.js';

export function createMockElement(options: {
  tagName: string;
  textContent?: string | null;
  innerHTML?: string;
  attributes?: Record<string, string>;
  children?: ElementLike[];
}): ElementLike {
  const { tagName, textContent = '', innerHTML = '', attributes = {}, children = [] } = options;
  
  // Create mock attributes
  const mockAttributes: AttributeLike[] = Object.entries(attributes).map(([name, value]) => ({
    name,
    value
  }));
  
  const namedNodeMap: NamedNodeMapLike = {
    length: mockAttributes.length,
    ...mockAttributes.reduce((acc, attr, index) => ({
      ...acc,
      [index]: attr
    }), {}),
    [Symbol.iterator]: function* () {
      for (const attr of mockAttributes) {
        yield attr;
      }
    }
  };
  
  const htmlCollection: HTMLCollectionLike = {
    length: children.length,
    ...children.reduce((acc, child, index) => ({
      ...acc,
      [index]: child
    }), {}),
    [Symbol.iterator]: function* () {
      for (const child of children) {
        yield child;
      }
    }
  };
  
  const nodeList: NodeListLike = {
    length: children.length,
    ...children.reduce((acc, child, index) => ({
      ...acc,
      [index]: child
    }), {}),
    [Symbol.iterator]: function* () {
      for (const child of children) {
        yield child as NodeLike;
      }
    }
  };
  
  const element: ElementLike = {
    // Node properties
    nodeType: NodeType.ELEMENT_NODE,
    nodeName: tagName.toUpperCase(),
    nodeValue: null,
    textContent,
    parentNode: null,
    parentElement: null,
    childNodes: nodeList,
    firstChild: children[0] || null,
    lastChild: children[children.length - 1] || null,
    previousSibling: null,
    nextSibling: null,
    
    // Element properties
    tagName: tagName.toUpperCase(),
    innerHTML,
    outerHTML: `<${tagName}>${innerHTML}</${tagName}>`,
    children: htmlCollection,
    attributes: namedNodeMap,
    
    // Methods
    getAttribute(name: string): string | null {
      return attributes[name] || null;
    },
    
    setAttribute(name: string, value: string): void {
      attributes[name] = value;
    },
    
    removeAttribute(name: string): void {
      delete attributes[name];
    },
    
    hasAttribute(name: string): boolean {
      return name in attributes;
    },
    
    querySelector(_selectors: string): ElementLike | null {
      return null;
    },
    
    querySelectorAll(_selectors: string): ElementLike[] {
      return [];
    },
    
    appendChild(node: NodeLike): NodeLike {
      children.push(node as ElementLike);
      return node;
    },
    
    removeChild(_child: NodeLike): NodeLike {
      throw new Error('Not implemented in mock');
    },
    
    replaceChild(_newChild: NodeLike, _oldChild: NodeLike): NodeLike {
      throw new Error('Not implemented in mock');
    },
    
    insertBefore(_newChild: NodeLike, _refChild: NodeLike | null): NodeLike {
      throw new Error('Not implemented in mock');
    },
    
    cloneNode(_deep?: boolean): NodeLike {
      throw new Error('Not implemented in mock');
    },
    
    contains(_other: NodeLike | null): boolean {
      return false;
    },
    
    hasChildNodes(): boolean {
      return children.length > 0;
    },
    
    closest(_selector: string): ElementLike | null {
      return null;
    },
    
    matches(_selectors: string): boolean {
      return false;
    }
  };
  
  return element;
}

export function createMockTextNode(text: string): NodeLike {
  return {
    nodeType: NodeType.TEXT_NODE,
    nodeName: '#text',
    nodeValue: text,
    textContent: text,
    parentNode: null,
    parentElement: null,
    childNodes: [] as NodeLike[],
    firstChild: null,
    lastChild: null,
    previousSibling: null,
    nextSibling: null,
    
    cloneNode(_deep?: boolean): NodeLike {
      return createMockTextNode(text);
    },
    
    contains(_other: NodeLike | null): boolean {
      return false;
    },
    
    hasChildNodes(): boolean {
      return false;
    }
  };
}