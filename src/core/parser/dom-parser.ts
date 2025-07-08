/**
 * Safe DOM parser with flexible DOM implementation support
 */

import { InvalidHTMLError } from '@/errors/converter-errors.js';
import { validateInput, checkNestingDepth, createSafeParser } from '@/core/security/sanitizer.js';
import { log } from '@/utilities/logger.js';
import type { DOMParserLike, DocumentLike, ElementLike } from '@/types/dom.js';

export class SafeDOMParser {
  private parser: DOMParserLike;

  constructor(parser?: DOMParserLike) {
    this.parser = parser || createSafeParser();
  }

  /**
   * Parse HTML string into a Document object
   */
  parse(html: string): DocumentLike {
    // Validate input first
    validateInput(html);

    // Parse HTML using DOMParser (safe - doesn't execute scripts)
    const doc = this.parser.parseFromString(html, 'text/html');

    // Check for parser errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new InvalidHTMLError('cash-out: Failed to parse HTML', {
        error: parserError.textContent,
      });
    }

    // Check nesting depth
    checkNestingDepth(doc.documentElement);

    // Log parsing success
    log.debug('Successfully parsed HTML document', {
      bodyLength: doc.body?.innerHTML?.length || 0,
      hasHead: !!doc.head,
      hasBody: !!doc.body,
    });

    return doc;
  }

  /**
   * Parse HTML fragment into an Element
   * Useful for parsing snippets without full document structure
   */
  parseFragment(html: string): ElementLike {
    // Validate input first
    validateInput(html);

    // Wrap in minimal document structure
    const wrappedHtml = `<!DOCTYPE html><html><body>${html}</body></html>`;
    const doc = this.parse(wrappedHtml);
    
    // Return the body element which contains the fragment
    if (!doc.body) {
      throw new InvalidHTMLError('cash-out: Failed to parse HTML fragment');
    }
    
    return doc.body;
  }


}