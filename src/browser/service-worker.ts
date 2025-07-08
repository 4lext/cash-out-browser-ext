/**
 * Service Worker-specific implementation for HTML to Markdown conversion
 * Runs directly without creating Web Workers since Service Workers can't spawn workers
 */

import type { ConversionOptions, MarkdownResult } from '@/types/html-to-markdown.js';
import { SafeDOMParser } from '@/core/parser/dom-parser.js';
import { HTMLToMarkdownConverter } from '@/core/converter/converter.js';
import { InvalidHTMLError, SizeLimitError } from '@/errors/converter-errors.js';

/**
 * Convert HTML to Markdown in Service Worker environment
 * Runs synchronously since we can't use Web Workers
 */
export async function convertToMarkdown(
  html: string,
  options?: ConversionOptions
): Promise<MarkdownResult> {
  // Validate input size
  const byteSize = new TextEncoder().encode(html).length;
  const maxSize = options?.maxInputSize ?? 10 * 1024 * 1024;

  if (byteSize > maxSize) {
    throw new SizeLimitError(byteSize, maxSize);
  }

  try {
    // Create parser and converter instances
    const parser = new SafeDOMParser();
    const converter = new HTMLToMarkdownConverter(options);

    // Parse HTML
    const doc = parser.parse(html);

    // Convert to Markdown (runs synchronously)
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
 * No-op cleanup function for Service Worker environment
 */
export function cleanup(): void {
  // Nothing to clean up in Service Worker environment
}

// Export types for convenience
export type { ConversionOptions, MarkdownResult, ConversionMetadata } from '@/types/html-to-markdown.js';
export { InvalidHTMLError, SizeLimitError, ConversionTimeoutError, SecurityError } from '@/errors/converter-errors.js';