/**
 * Universal entry point for HTML to Markdown converter
 * Automatically detects environment and provides appropriate API
 */

// Import all APIs
import * as browserApi from './browser/index.js';
import * as serviceWorkerApi from './browser/service-worker.js';
import * as serverApi from './server/index.js';

// Detect environment more conservatively for bundled library
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && typeof navigator !== 'undefined';
const isWebWorker = typeof (globalThis as Record<string, unknown>)['importScripts'] === 'function';
const isServiceWorker = typeof self !== 'undefined' && 'ServiceWorkerGlobalScope' in globalThis;

// Determine which API to use based on environment capabilities
let selectedApi;
if (isServiceWorker) {
  // Service Workers can't create Web Workers, use direct implementation
  selectedApi = serviceWorkerApi;
} else if (isBrowser && typeof window.Worker !== 'undefined') {
  // Real browsers with Web Worker support - use browser API
  selectedApi = browserApi;
} else if (isWebWorker) {
  // Inside a Web Worker - use service worker API (no nested workers)
  selectedApi = serviceWorkerApi;
} else {
  // Server environments (Node.js/Bun/Deno) - use server API
  selectedApi = serverApi;
}

// Export the appropriate API based on environment
export const convertToMarkdown = selectedApi.convertToMarkdown;
export const htmlToMarkdown = selectedApi === serverApi ? serverApi.htmlToMarkdown : undefined;
export const convertBatch = selectedApi === serverApi ? serverApi.convertBatch : undefined;
export const cleanup = selectedApi === serverApi ? undefined : (selectedApi as typeof browserApi | typeof serviceWorkerApi).cleanup;

// Export all types
export * from './types/index.js';

// Export error classes
export { BaseError } from './errors/custom-errors.js';
export { 
  InvalidHTMLError, 
  SizeLimitError, 
  ConversionTimeoutError, 
  SecurityError 
} from './errors/converter-errors.js';

// Export server-specific functions when available
export { initializeDOMProvider } from './server/index.js';
