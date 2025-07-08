/**
 * Flexible DOM type definitions that work with both browser DOM and DOM-like implementations
 * This allows the library to work with any DOM-compliant environment (browser, Happy DOM, jsdom, etc.)
 */

/**
 * Minimal DOMParser interface that works with any implementation
 */
export interface DOMParserLike {
  parseFromString(string: string, type: DOMParserSupportedType | string): DocumentLike;
}

/**
 * Minimal Document interface that works with any implementation
 */
export interface DocumentLike {
  documentElement: ElementLike;
  body?: ElementLike | null;
  head?: ElementLike | null;
  querySelector(selectors: string): ElementLike | null;
  querySelectorAll(selectors: string): ElementLike[];
  createElement(tagName: string): ElementLike;
  createTextNode(data: string): NodeLike;
  getElementById?(elementId: string): ElementLike | null;
}

/**
 * Minimal Element interface that works with any implementation
 */
export interface ElementLike extends NodeLike {
  tagName: string;
  innerHTML: string;
  outerHTML: string;
  textContent: string | null;
  children: HTMLCollectionLike | ElementLike[];
  attributes: NamedNodeMapLike | AttributeLike[];
  classList?: DOMTokenListLike;
  
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
  
  querySelector(selectors: string): ElementLike | null;
  querySelectorAll(selectors: string): ElementLike[];
  
  appendChild(node: NodeLike): NodeLike;
  removeChild(child: NodeLike): NodeLike;
  replaceChild(newChild: NodeLike, oldChild: NodeLike): NodeLike;
  insertBefore(newChild: NodeLike, refChild: NodeLike | null): NodeLike;
  
  closest(selector: string): ElementLike | null;
  matches(selectors: string): boolean;
}

/**
 * Minimal Node interface that works with any implementation
 */
export interface NodeLike {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  textContent: string | null;
  parentNode: NodeLike | null;
  parentElement: ElementLike | null;
  childNodes: NodeListLike | NodeLike[];
  firstChild: NodeLike | null;
  lastChild: NodeLike | null;
  previousSibling: NodeLike | null;
  nextSibling: NodeLike | null;
  
  cloneNode(deep?: boolean): NodeLike;
  contains(other: NodeLike | null): boolean;
  hasChildNodes(): boolean;
}

/**
 * Minimal Text node interface
 */
export interface TextLike extends NodeLike {
  data: string;
  length: number;
  wholeText: string;
  
  splitText?(offset: number): TextLike;
  appendData?(data: string): void;
  deleteData?(offset: number, count: number): void;
  insertData?(offset: number, data: string): void;
  replaceData?(offset: number, count: number, data: string): void;
  substringData?(offset: number, count: number): string;
}

/**
 * Minimal Attribute interface
 */
export interface AttributeLike {
  name: string;
  value: string;
}

/**
 * Minimal NamedNodeMap interface
 */
export interface NamedNodeMapLike {
  length: number;
  [index: number]: AttributeLike;
  [Symbol.iterator]?: () => Iterator<AttributeLike>;
}

/**
 * Minimal HTMLCollection interface
 */
export interface HTMLCollectionLike {
  length: number;
  [index: number]: ElementLike;
  [Symbol.iterator]?: () => Iterator<ElementLike>;
}

/**
 * Minimal NodeList interface
 */
export interface NodeListLike {
  length: number;
  [index: number]: NodeLike;
  [Symbol.iterator]?: () => Iterator<NodeLike>;
}

/**
 * Minimal DOMTokenList interface
 */
export interface DOMTokenListLike {
  contains(token: string): boolean;
  add(...tokens: string[]): void;
  remove(...tokens: string[]): void;
  toggle(token: string, force?: boolean): boolean;
}

/**
 * DOM implementation provider interface
 */
export interface DOMProvider {
  createParser(): DOMParserLike;
  createDocument(): DocumentLike;
}

/**
 * Type guards for DOM-like objects
 */
export function isDocumentLike(obj: unknown): obj is DocumentLike {
  return !!(obj && 
    typeof obj === 'object' && 
    'documentElement' in obj &&
    'querySelector' in obj);
}

export function isElementLike(obj: unknown): obj is ElementLike {
  return !!(obj && 
    typeof obj === 'object' && 
    'tagName' in obj &&
    'getAttribute' in obj &&
    'nodeType' in obj);
}

export function isNodeLike(obj: unknown): obj is NodeLike {
  return !!(obj && 
    typeof obj === 'object' && 
    'nodeType' in obj &&
    'nodeName' in obj);
}

export function isTextLike(obj: unknown): obj is TextLike {
  return obj !== null && 
    typeof obj === 'object' && 
    'nodeType' in obj &&
    (obj as NodeLike).nodeType === NodeType.TEXT_NODE &&
    'data' in obj;
}

/**
 * Node type constants (same as standard DOM)
 */
export const NodeType = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
} as const;