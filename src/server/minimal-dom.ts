/**
 * Minimal DOM setup for server environments
 * Only creates what we actually need for HTML parsing
 */

import { Window } from 'happy-dom';

// Create a single window instance for the entire module
let sharedWindow: Window | null = null;

/**
 * Get or create a shared window instance
 */
function getSharedWindow(): Window {
  if (!sharedWindow) {
    sharedWindow = new Window({
      url: 'https://localhost',
      width: 1024,
      height: 768
    });
  }
  return sharedWindow;
}

/**
 * Get DOMParser instance without polluting globals
 */
export function getDOMParser(): DOMParser {
  return getSharedWindow().DOMParser as unknown as DOMParser;
}

/**
 * Create a document without polluting globals
 */
export function createDocument(): Document {
  return getSharedWindow().document as unknown as Document;
}

/**
 * Parse HTML string directly
 */
export function parseHTML(html: string): Document {
  const parser = getDOMParser();
  return parser.parseFromString(html, 'text/html');
}

/**
 * Clean up resources when done
 */
export function cleanup(): void {
  if (sharedWindow) {
    sharedWindow.close();
    sharedWindow = null;
  }
}