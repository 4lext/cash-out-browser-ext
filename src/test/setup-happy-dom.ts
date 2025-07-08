/**
 * Setup Happy DOM for testing
 * This file initializes the DOM provider with Happy DOM
 */

import { Window } from 'happy-dom';
import { initializeDOMProvider } from '@/server/index.js';
import type { DOMParserLike, DocumentLike } from '@/types/dom.js';

// Create a window instance
const window = new Window({
  url: 'https://localhost:3000',
  width: 1024,
  height: 768
});

// Initialize the DOM provider for server-side usage
initializeDOMProvider({
  createParser: () => new window.DOMParser() as unknown as DOMParserLike,
  createDocument: () => window.document as unknown as DocumentLike
});

// Set global DOM objects for backward compatibility
(global as Record<string, unknown>)['window'] = window;
(global as Record<string, unknown>)['document'] = window.document;
(global as Record<string, unknown>)['DOMParser'] = window.DOMParser;
(global as Record<string, unknown>)['Element'] = window.Element;
(global as Record<string, unknown>)['HTMLElement'] = window.HTMLElement;
(global as Record<string, unknown>)['Node'] = window.Node;
(global as Record<string, unknown>)['NodeFilter'] = window.NodeFilter;

// Export window for tests that need direct access
export { window };