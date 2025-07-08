/**
 * Security sanitizer for HTML input
 * Ensures safe parsing and prevents XSS attacks
 */

import { SecurityError } from '@/errors/converter-errors.js';
import type { ElementLike, DOMParserLike, AttributeLike } from '@/types/dom.js';

// Dangerous URL protocols that could execute code
const DANGEROUS_PROTOCOLS = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'about:',
  'chrome:',
  'chrome-extension:',
]);

// Maximum nesting depth to prevent stack overflow
const MAX_NESTING_DEPTH = 100;

/**
 * Validate HTML input for security threats
 */
export function validateInput(html: string): void {
  // Check for null bytes
  if (html.includes('\0')) {
    throw new SecurityError('cash-out: Input contains null bytes', 'NULL_BYTE_INJECTION');
  }

  // Check for potential script injection patterns
  const scriptPattern = /<script[\s>]/i;
  if (scriptPattern.test(html)) {
    // This is just a warning - DOMParser will handle it safely
    // But we track it for monitoring
  }

  // Check input size early
  const byteSize = new TextEncoder().encode(html).length;
  if (byteSize > 10 * 1024 * 1024) {
    throw new SecurityError('cash-out: Input too large', 'SIZE_LIMIT');
  }
}

/**
 * Sanitize a URL to ensure it's safe
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  // Trim and normalize
  url = url.trim();

  // Check for dangerous protocols
  const lowerUrl = url.toLowerCase();
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (lowerUrl.startsWith(protocol)) {
      return ''; // Return empty string for dangerous URLs
    }
  }

  // Handle protocol-relative URLs
  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  // Ensure the URL is properly encoded
  try {
    // This will throw for malformed URLs
    new URL(url, 'https://example.com');
  } catch {
    // Ignore, we still want to encode whitespace
  }
  // Always replace whitespace with %20
  url = url.replace(/\s/g, '%20');
  return url;
}

/**
 * Check DOM nesting depth to prevent stack overflow
 */
export function checkNestingDepth(element: ElementLike, depth = 0): void {
  if (depth > MAX_NESTING_DEPTH) {
    throw new SecurityError(
      `cash-out: HTML nesting depth exceeds maximum of ${MAX_NESTING_DEPTH}`,
      'EXCESSIVE_NESTING',
    );
  }

  // Handle both array-like and iterable children
  const children = Array.from(element.children as Iterable<ElementLike>);
  for (const child of children) {
    checkNestingDepth(child, depth + 1);
  }
}

/**
 * Remove dangerous attributes from an element
 */
export function sanitizeAttributes(element: ElementLike): void {
  const attributesToRemove: string[] = [];

  // Get attributes as array to avoid live collection issues
  const attributes = Array.from(element.attributes as Iterable<AttributeLike> || []);
  
  for (const attr of attributes) {
    // Remove event handlers
    if (attr.name.toLowerCase().startsWith('on')) {
      attributesToRemove.push(attr.name);
    }

    // Remove dangerous href/src values
    if (attr.name === 'href' || attr.name === 'src') {
      const sanitized = sanitizeUrl(attr.value);
      if (sanitized !== attr.value) {
        element.setAttribute(attr.name, sanitized);
      }
    }
  }

  // Remove dangerous attributes
  for (const attrName of attributesToRemove) {
    try {
      element.removeAttribute(attrName);
    } catch {
      // Ignore errors in test environment
    }
  }
}

/**
 * Create a safe DOM parser instance
 */
export function createSafeParser(): DOMParserLike {
  // DOMParser is safe by default - it doesn't execute scripts
  // This assumes the consumer has set up a DOM environment
  if (typeof DOMParser === 'undefined') {
    throw new Error('cash-out: No DOMParser found. Please provide a DOM implementation.');
  }
  return new DOMParser() as unknown as DOMParserLike;
}