/**
 * Server entry point for HTML to Markdown converter
 * Provides synchronous API for Node.js/Bun server environments
 */

import type { ConversionOptions, MarkdownResult } from '@/types/html-to-markdown.js';
import type { DOMParserLike, DOMProvider } from '@/types/dom.js';
import { SafeDOMParser } from '@/core/parser/dom-parser.js';
import { HTMLToMarkdownConverter } from '@/core/converter/converter.js';
import { InvalidHTMLError, SizeLimitError } from '@/errors/converter-errors.js';

// Store the DOM provider for server-side usage
let domProvider: DOMProvider | null = null;

/**
 * Initialize the server with a DOM implementation
 * Must be called before using any conversion functions
 * 
 * @param provider - DOM implementation provider
 * 
 * @example
 * // Using Happy DOM
 * import { Window } from 'happy-dom';
 * const window = new Window();
 * initializeDOMProvider({
 *   createParser: () => new window.DOMParser(),
 *   createDocument: () => window.document
 * });
 * 
 * // Using jsdom
 * import { JSDOM } from 'jsdom';
 * const dom = new JSDOM();
 * initializeDOMProvider({
 *   createParser: () => new dom.window.DOMParser(),
 *   createDocument: () => dom.window.document
 * });
 */
export function initializeDOMProvider(provider: DOMProvider): void {
  domProvider = provider;
  
  // Also set up globals if they don't exist (for backward compatibility)
  if (typeof globalThis.DOMParser === 'undefined') {
    const parser = provider.createParser();
    if ('constructor' in parser) {
      (globalThis as Record<string, unknown>)['DOMParser'] = parser.constructor;
    }
  }
}

/**
 * Convert HTML to Markdown (synchronous server API)
 * 
 * @param html - HTML string to convert
 * @param options - Conversion options
 * @param parser - Optional custom DOM parser (uses default if not provided)
 * @returns Markdown result object
 */
export function convertToMarkdown(
  html: string,
  options?: ConversionOptions & { parser?: DOMParserLike }
): MarkdownResult {
  // Validate input size
  const byteSize = new TextEncoder().encode(html).length;
  const maxSize = options?.maxInputSize ?? 10 * 1024 * 1024; // 10MB default

  if (byteSize > maxSize) {
    throw new SizeLimitError(byteSize, maxSize);
  }

  try {
    // Create parser instance
    let parserInstance: DOMParserLike | undefined = options?.parser;
    
    // Try to get parser from options, then provider, then fall back to global
    if (!parserInstance && domProvider) {
      parserInstance = domProvider.createParser();
    }
    
    const parser = new SafeDOMParser(parserInstance);
    const converter = new HTMLToMarkdownConverter(options);

    // Parse HTML
    const doc = parser.parse(html);

    // Convert to Markdown
    const result = converter.convert(doc);

    return result;
  } catch (error) {
    // Re-throw known errors
    if (error instanceof InvalidHTMLError || 
        error instanceof SizeLimitError ||
        error instanceof Error) {
      throw error;
    }
    
    // Wrap unknown errors
    throw new Error(`cash-out: Conversion failed: ${String(error)}`);
  }
}

/**
 * Convert HTML to Markdown string (convenience method)
 * 
 * @param html - HTML string to convert
 * @param options - Conversion options
 * @returns Markdown string
 */
export function htmlToMarkdown(
  html: string,
  options?: ConversionOptions
): string {
  const result = convertToMarkdown(html, options);
  return result.markdown;
}

/**
 * Batch convert multiple HTML documents
 * 
 * @param documents - Array of HTML strings or objects with html and options
 * @returns Array of markdown results
 */
export function convertBatch(
  documents: Array<string | { html: string; options?: ConversionOptions }>
): MarkdownResult[] {
  return documents.map(doc => {
    if (typeof doc === 'string') {
      return convertToMarkdown(doc);
    } else {
      return convertToMarkdown(doc.html, doc.options);
    }
  });
}

// Export types for convenience
export type { ConversionOptions, MarkdownResult, ConversionMetadata } from '@/types/html-to-markdown.js';
export type { DOMProvider, DOMParserLike, DocumentLike, ElementLike } from '@/types/dom.js';
export { InvalidHTMLError, SizeLimitError, ConversionTimeoutError, SecurityError } from '@/errors/converter-errors.js';