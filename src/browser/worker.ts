/**
 * Web Worker for HTML to Markdown conversion
 * Runs in isolated context for security and performance
 */

import type { WorkerMessage, WorkerResponse } from '@/types/html-to-markdown.js';
import type { DocumentLike, ElementLike, NodeLike, DOMParserLike, AttributeLike, TextLike } from '@/types/dom.js';
import { SafeDOMParser } from '@/core/parser/dom-parser.js';
import { HTMLToMarkdownConverter } from '@/core/converter/converter.js';
import { InvalidHTMLError, SizeLimitError, ConversionTimeoutError, SecurityError } from '@/errors/converter-errors.js';

// Simple HTML parser for Web Workers
// This provides basic HTML parsing functionality for the converter
class WorkerDOMParser implements DOMParserLike {
  parseFromString(html: string): DocumentLike {
    // Simple regex-based parser that handles nested table structures properly
    const body = this.parseHTML(html);
    
    return {
      documentElement: {
        tagName: 'HTML',
        innerHTML: html,
        outerHTML: `<html>${html}</html>`,
        textContent: this.getTextContent(html),
        children: [body],
        attributes: [],
        nodeType: 1,
        nodeName: 'HTML',
        nodeValue: null,
        parentNode: null,
        parentElement: null,
        childNodes: [body],
        firstChild: body,
        lastChild: body,
        previousSibling: null,
        nextSibling: null,
        querySelector: (selector: string) => this.querySelector(body, selector),
        querySelectorAll: (selector: string) => this.querySelectorAll(body, selector),
        getAttribute: () => null,
        setAttribute: () => {},
        removeAttribute: () => {},
        hasAttribute: () => false,
        appendChild: (node: NodeLike) => node,
        removeChild: (node: NodeLike) => node,
        replaceChild: (_newChild: NodeLike, oldChild: NodeLike) => oldChild,
        insertBefore: (newChild: NodeLike, _refChild: NodeLike | null) => newChild,
        closest: () => null,
        matches: () => false,
        cloneNode: () => this.parseGeneralHTML(html),
        contains: (node: NodeLike) => node === body,
        hasChildNodes: () => true,
      },
      body,
      head: null,
      querySelector: (selector: string) => this.querySelector(body, selector),
      querySelectorAll: (selector: string) => this.querySelectorAll(body, selector),
      createElement: (tagName: string) => this.createElement(tagName),
      createTextNode: (data: string) => this.createTextNode(data),
    };
  }

  parseHTML(html: string): ElementLike {
    // Parse all HTML, not just tables
    return this.parseGeneralHTML(html);
  }
  
  parseGeneralHTML(html: string): ElementLike {
    const stack: { element: ElementLike; tagName: string }[] = [];
    const bodyChildren: ElementLike[] = [];
    const bodyChildNodes: NodeLike[] = [];
    
    // Simple tokenizer
    let i = 0;
    let currentText = '';
    
    const body: ElementLike = {
      tagName: 'BODY',
      innerHTML: html,
      outerHTML: `<body>${html}</body>`,
      textContent: '',
      children: bodyChildren,
      childNodes: bodyChildNodes,
      attributes: [],
      nodeType: 1,
      nodeName: 'BODY',
      nodeValue: null,
      parentNode: null,
      parentElement: null,
      firstChild: null,
      lastChild: null,
      previousSibling: null,
      nextSibling: null,
      querySelector: (selector: string) => this.querySelector(body, selector),
      querySelectorAll: (selector: string) => this.querySelectorAll(body, selector),
      getAttribute: () => null,
      setAttribute: () => {},
      removeAttribute: () => {},
      hasAttribute: () => false,
      appendChild: (node: NodeLike) => { 
        bodyChildNodes.push(node); 
        if (node.nodeType === 1) bodyChildren.push(node as ElementLike);
        return node; 
      },
      removeChild: (node: NodeLike) => node,
      replaceChild: (_newChild: NodeLike, oldChild: NodeLike) => oldChild,
      insertBefore: (newChild: NodeLike, _refChild: NodeLike | null) => newChild,
      closest: () => null,
      matches: () => false,
      cloneNode: () => this.parseGeneralHTML(html),
      contains: (node: NodeLike) => {
        const checkNode = (parent: ElementLike, target: NodeLike): boolean => {
          if (parent === target) return true;
          for (const child of (parent.children as ElementLike[]) || []) {
            if (checkNode(child, target)) return true;
          }
          return false;
        };
        return checkNode(body, node);
      },
      hasChildNodes: () => bodyChildNodes.length > 0,
    };
    
    // Current parent element
    let currentParent = body;
    
    while (i < html.length) {
      if (html[i] === '<') {
        // Save any accumulated text
        if (currentText.trim()) {
          const textNode = this.createTextNode(currentText.trim());
          (currentParent.childNodes as NodeLike[]).push(textNode);
          currentText = '';
        }
        
        // Find end of tag
        let tagEnd = html.indexOf('>', i);
        if (tagEnd === -1) break;
        
        const tag = html.substring(i + 1, tagEnd);
        
        if (tag.startsWith('/')) {
          // Closing tag
          const tagName = tag.substring(1).toUpperCase();
          const top = stack[stack.length - 1];
          if (stack.length > 0 && top && top.tagName === tagName) {
            stack.pop();
            const newTop = stack[stack.length - 1];
            currentParent = stack.length > 0 && newTop ? newTop.element : body;
          }
        } else if (!tag.endsWith('/')) {
          // Opening tag (not self-closing)
          const spaceIndex = tag.indexOf(' ');
          const tagName = (spaceIndex > -1 ? tag.substring(0, spaceIndex) : tag).toUpperCase();
          const attrs = spaceIndex > -1 ? tag.substring(spaceIndex + 1) : '';
          
          const element = this.createSimpleElement(tagName, attrs);
          (currentParent.childNodes as NodeLike[]).push(element);
          if (element.nodeType === 1) {
            (currentParent.children as ElementLike[]).push(element);
          }
          
          stack.push({ element, tagName });
          currentParent = element;
        }
        
        i = tagEnd + 1;
      } else {
        currentText += html[i];
        i++;
      }
    }
    
    // Add any remaining text
    if (currentText.trim()) {
      const textNode = this.createTextNode(currentText.trim());
      (currentParent.childNodes as NodeLike[]).push(textNode);
    }
    
    // Update text content for all elements
    this.updateTextContent(body);
    
    // Update body properties
    body.firstChild = bodyChildNodes[0] || null;
    body.lastChild = bodyChildNodes[bodyChildNodes.length - 1] || null;
    body.textContent = this.getTextContent(html);
    
    return body;
  }
  
  createSimpleElement(tagName: string, attrsStr: string): ElementLike {
    const children: ElementLike[] = [];
    const childNodes: NodeLike[] = [];
    const attributes: AttributeLike[] = [];
    
    // Parse attributes
    if (attrsStr) {
      const attrRegex = /(\w+)=["']([^"']*)["']/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attributes.push({ name: attrMatch[1]!, value: attrMatch[2]! });
      }
    }
    
    const element: ElementLike = {
      tagName,
      innerHTML: '',
      outerHTML: '',
      textContent: '',
      children,
      childNodes,
      attributes,
      nodeType: 1,
      nodeName: tagName,
      nodeValue: null,
      parentNode: null,
      parentElement: null,
      firstChild: null,
      lastChild: null,
      previousSibling: null,
      nextSibling: null,
      querySelector: (selector: string) => this.querySelector(element, selector),
      querySelectorAll: (selector: string) => this.querySelectorAll(element, selector),
      getAttribute: (name: string) => {
        const attr = attributes.find(a => a.name === name);
        return attr ? attr.value : null;
      },
      setAttribute: () => {},
      removeAttribute: () => {},
      hasAttribute: (name: string) => attributes.some(a => a.name === name),
      appendChild: (node: NodeLike) => { 
        childNodes.push(node); 
        if (node.nodeType === 1) children.push(node as ElementLike);
        element.firstChild = childNodes[0] || null;
        element.lastChild = childNodes[childNodes.length - 1] || null;
        return node; 
      },
      removeChild: (node: NodeLike) => node,
      replaceChild: (_newChild: NodeLike, oldChild: NodeLike) => oldChild,
      insertBefore: (newChild: NodeLike, _refChild: NodeLike | null) => newChild,
      closest: () => null,
      matches: () => false,
      cloneNode: () => this.createSimpleElement(tagName, attrsStr),
      contains: (node: NodeLike) => {
        const checkNode = (parent: ElementLike, target: NodeLike): boolean => {
          if (parent === target) return true;
          for (const child of (parent.children as ElementLike[]) || []) {
            if (checkNode(child, target)) return true;
          }
          return false;
        };
        return checkNode(element, node);
      },
      hasChildNodes: () => childNodes.length > 0,
    };
    
    return element;
  }


  private createElement(tagName: string): ElementLike {
    return {
      tagName: tagName.toUpperCase(),
      innerHTML: '',
      outerHTML: `<${tagName.toLowerCase()}></${tagName.toLowerCase()}>`,
      textContent: '',
      children: [],
      childNodes: [],
      attributes: [],
      nodeType: 1,
      nodeName: tagName.toUpperCase(),
      nodeValue: null,
      parentNode: null,
      parentElement: null,
      firstChild: null,
      lastChild: null,
      previousSibling: null,
      nextSibling: null,
      querySelector: (selector: string) => {
        const table = this.createElement(tagName);
        return this.querySelector(table, selector);
      },
      querySelectorAll: (selector: string) => {
        const table = this.createElement(tagName);
        return this.querySelectorAll(table, selector);
      },
      getAttribute: () => null,
      setAttribute: () => {},
      removeAttribute: () => {},
      hasAttribute: () => false,
      appendChild: (node: NodeLike) => { 
        const element = this.createElement(tagName);
        (element.childNodes as NodeLike[]).push(node); 
        if (node.nodeType === 1) (element.children as ElementLike[]).push(node as ElementLike);
        return node; 
      },
      removeChild: (node: NodeLike) => node,
      replaceChild: (_newChild: NodeLike, oldChild: NodeLike) => oldChild,
      insertBefore: (newChild: NodeLike, _refChild: NodeLike | null) => newChild,
      closest: () => null,
      matches: () => false,
      cloneNode: () => this.createElement(tagName),
      contains: () => false,
      hasChildNodes: () => false,
    };
  }

  private createTextNode(data: string): TextLike {
    return {
      data,
      length: data.length,
      wholeText: data,
      nodeType: 3,
      nodeName: '#text',
      nodeValue: data,
      textContent: data,
      parentNode: null,
      parentElement: null,
      childNodes: [],
      firstChild: null,
      lastChild: null,
      previousSibling: null,
      nextSibling: null,
      cloneNode: () => this.createTextNode(data),
      contains: () => false,
      hasChildNodes: () => false,
    };
  }

  private getTextContent(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
  
  private updateTextContent(element: ElementLike): string {
    let text = '';
    
    for (const child of (element.childNodes as NodeLike[]) || []) {
      if (child.nodeType === 3) { // Text node
        text += child.textContent || '';
      } else if (child.nodeType === 1) { // Element node
        const childText = this.updateTextContent(child as ElementLike);
        text += childText;
      }
    }
    
    element.textContent = text;
    return text;
  }

  private querySelector(element: ElementLike, selector: string): ElementLike | null {
    // Handle multiple selectors (comma-separated)
    if (selector.includes(',')) {
      const selectors = selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        const result = this.querySelector(element, sel);
        if (result) return result;
      }
      return null;
    }
    
    const tagName = selector.toUpperCase();
    
    if (element.tagName === tagName) {
      return element;
    }
    
    for (const child of (element.children as ElementLike[]) || []) {
      const result = this.querySelector(child, selector);
      if (result) return result;
    }
    
    return null;
  }

  private querySelectorAll(element: ElementLike, selector: string): ElementLike[] {
    const results: ElementLike[] = [];
    
    // Handle multiple selectors (comma-separated)
    if (selector.includes(',')) {
      const selectors = selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        results.push(...this.querySelectorAll(element, sel));
      }
      return results;
    }
    
    const tagName = selector.toUpperCase();
    
    if (element.tagName === tagName) {
      results.push(element);
    }
    
    for (const child of (element.children as ElementLike[]) || []) {
      results.push(...this.querySelectorAll(child, selector));
    }
    
    return results;
  }
}

// Make DOMParser available in the worker context
(globalThis as unknown as { DOMParser: typeof WorkerDOMParser }).DOMParser = WorkerDOMParser;

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type !== 'cash-out:convert') {
    return;
  }

  try {
    // Create parser and converter instances
    const parser = new SafeDOMParser();
    const converter = new HTMLToMarkdownConverter(message.options);

    // Parse HTML
    const doc = parser.parse(message.html);

    // Convert to Markdown
    const result = converter.convert(doc);

    // Send result back
    const response: WorkerResponse = {
      type: 'cash-out:result',
      id: message.id,
      result,
    };

    self.postMessage(response);
  } catch (error) {
    // Handle errors
    const response: WorkerResponse = {
      type: 'cash-out:error',
      id: message.id,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: getErrorCode(error),
      },
    };

    self.postMessage(response);
  }
});

/**
 * Get error code from error instance
 */
function getErrorCode(error: unknown): string {
  if (error instanceof InvalidHTMLError) return 'INVALID_HTML';
  if (error instanceof SizeLimitError) return 'SIZE_LIMIT_EXCEEDED';
  if (error instanceof ConversionTimeoutError) return 'CONVERSION_TIMEOUT';
  if (error instanceof SecurityError) return 'SECURITY_VIOLATION';
  return 'UNKNOWN_ERROR';
}

// Log worker initialization
console.log('cash-out: Worker initialized');