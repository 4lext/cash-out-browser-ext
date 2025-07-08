# cash-out API Documentation

Comprehensive API reference for the cash-out HTML to Markdown converter.

## Table of Contents

- [Core Functions](#core-functions)
- [Types](#types)
- [Error Handling](#error-handling)
- [Environment-Specific APIs](#environment-specific-apis)
- [Advanced Usage](#advanced-usage)
- [Migration Guide](#migration-guide)

## Core Functions

### `convertToMarkdown(html, options?)`

The main conversion function available in all environments.

```typescript
function convertToMarkdown(
  html: string,
  options?: ConversionOptions,
): Promise<MarkdownResult>;
```

#### Parameters

- `html` (string, required): The HTML string to convert to Markdown
- `options` (ConversionOptions, optional): Configuration options for the conversion

#### Returns

Returns a Promise that resolves to a `MarkdownResult` object.

#### Examples

```javascript
// Basic usage
const result = await convertToMarkdown('<h1>Hello World</h1>');
console.log(result.markdown); // # Hello World

// With options
const result = await convertToMarkdown(htmlString, {
  includeMetadata: true,
  optimizationLevel: 'aggressive',
  timeout: 10000,
});

// Error handling
try {
  const result = await convertToMarkdown(htmlString);
} catch (error) {
  if (error instanceof SizeLimitError) {
    console.error('HTML too large:', error.message);
  }
}
```

## Types

### ConversionOptions

Configuration options for HTML to Markdown conversion.

```typescript
interface ConversionOptions {
  // Extract main content using readability algorithms
  extractMainContent?: boolean; // default: true

  // Include metadata in the result
  includeMetadata?: boolean; // default: false

  // Maximum conversion time in milliseconds
  timeout?: number; // default: 5000

  // Maximum input size in bytes
  maxInputSize?: number; // default: 10485760 (10MB)

  // Optimization level for output
  optimizationLevel?: 'none' | 'standard' | 'aggressive'; // default: 'standard'

  // Server-only: Custom DOM parser instance
  parser?: DOMParserLike;
}
```

### MarkdownResult

The result object returned by conversion functions.

```typescript
interface MarkdownResult {
  // The converted Markdown content
  markdown: string;

  // Metadata about the conversion (when includeMetadata is true)
  metadata?: ConversionMetadata;
}
```

### ConversionMetadata

Metadata about the conversion process.

```typescript
interface ConversionMetadata {
  // Extracted document title (if found)
  title?: string;

  // Word count of the output
  wordCount: number;

  // Time taken for conversion in milliseconds
  conversionTimeMs: number;

  // Original HTML size in bytes
  originalSize: number;

  // Output Markdown size in bytes
  outputSize: number;
}
```

### DOMProvider

Server-only interface for providing DOM implementation.

```typescript
interface DOMProvider {
  // Create a new DOMParser instance
  createParser(): DOMParserLike;

  // Create a new Document instance
  createDocument(): DocumentLike;
}
```

## Error Handling

### Error Types

All errors extend from `BaseError` and include specific error codes.

#### InvalidHTMLError

Thrown when the input HTML is malformed or cannot be parsed.

```typescript
class InvalidHTMLError extends BaseError {
  code = 'INVALID_HTML';
  statusCode = 400;
}
```

#### SizeLimitError

Thrown when input exceeds the configured size limit.

```typescript
class SizeLimitError extends BaseError {
  code = 'SIZE_LIMIT_EXCEEDED';
  statusCode = 413;

  constructor(
    public actualSize: number,
    public maxSize: number
  );
}
```

#### ConversionTimeoutError

Thrown when conversion exceeds the timeout limit.

```typescript
class ConversionTimeoutError extends BaseError {
  code = 'CONVERSION_TIMEOUT';
  statusCode = 408;

  constructor(public timeout: number);
}
```

#### SecurityError

Thrown when potentially malicious content is detected.

```typescript
class SecurityError extends BaseError {
  code = 'SECURITY_ERROR';
  statusCode = 403;
}
```

### Error Handling Examples

```javascript
import {
  ConversionTimeoutError,
  convertToMarkdown,
  InvalidHTMLError,
  SizeLimitError,
} from 'cash-out';

try {
  const result = await convertToMarkdown(htmlString);
} catch (error) {
  if (error instanceof InvalidHTMLError) {
    console.error('Invalid HTML:', error.message);
  } else if (error instanceof SizeLimitError) {
    console.error(`Size limit exceeded: ${error.actualSize} > ${error.maxSize}`);
  } else if (error instanceof ConversionTimeoutError) {
    console.error(`Conversion timed out after ${error.timeout}ms`);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Environment-Specific APIs

### Browser/Service Worker Only

#### `cleanup()`

Terminates all Web Workers and releases resources.

```typescript
function cleanup(): void;
```

```javascript
import { cleanup, convertToMarkdown } from 'cash-out';

// Use the converter
await convertToMarkdown(html1);
await convertToMarkdown(html2);

// Clean up when done
cleanup();
```

### Server Only (Node.js/Bun)

#### `initializeDOMProvider(provider)`

Initialize the server environment with a DOM implementation.

```typescript
function initializeDOMProvider(provider: DOMProvider): void;
```

```javascript
import { initializeDOMProvider } from 'cash-out/server';
import { Window } from 'happy-dom';

const window = new Window();
initializeDOMProvider({
  createParser: () => new window.DOMParser(),
  createDocument: () => window.document,
});
```

#### `htmlToMarkdown(html, options?)`

Synchronous conversion that returns Markdown string directly.

```typescript
function htmlToMarkdown(html: string, options?: ConversionOptions): string;
```

```javascript
import { htmlToMarkdown } from 'cash-out/server';

const markdown = htmlToMarkdown('<h1>Hello</h1>');
console.log(markdown); // # Hello
```

#### `convertBatch(documents)`

Convert multiple documents in a single call.

```typescript
function convertBatch(
  documents: Array<string | { html: string; options?: ConversionOptions }>,
): MarkdownResult[];
```

```javascript
import { convertBatch } from 'cash-out/server';

const results = convertBatch([
  '<h1>Document 1</h1>',
  {
    html: '<h2>Document 2</h2>',
    options: { includeMetadata: true },
  },
  '<p>Document 3</p>',
]);

results.forEach((result, index) => {
  console.log(`Document ${index + 1}:`, result.markdown);
});
```

## Advanced Usage

### Optimization Levels

Control output optimization for different use cases:

```javascript
// No optimization - preserves all structure
const result = await convertToMarkdown(html, {
  optimizationLevel: 'none',
});

// Standard optimization (default) - balanced
const result = await convertToMarkdown(html, {
  optimizationLevel: 'standard',
});

// Aggressive optimization - best for LLMs
const result = await convertToMarkdown(html, {
  optimizationLevel: 'aggressive',
});
```

### Custom DOM Parser (Server)

Use a custom DOM parser implementation:

```javascript
import { convertToMarkdown } from 'cash-out/server';
import { JSDOM } from 'jsdom';

const dom = new JSDOM();
const result = await convertToMarkdown(html, {
  parser: new dom.window.DOMParser(),
});
```

### Handling Large Documents

Process large documents with custom limits:

```javascript
const result = await convertToMarkdown(largeHtml, {
  maxInputSize: 50 * 1024 * 1024, // 50MB
  timeout: 30000, // 30 seconds
  optimizationLevel: 'aggressive', // Reduce output size
});
```

### Feature Detection

Check available features in the current environment:

```javascript
import { cleanup, convertBatch, convertToMarkdown, htmlToMarkdown } from 'cash-out';

const features = {
  async: typeof convertToMarkdown !== 'undefined',
  sync: typeof htmlToMarkdown !== 'undefined',
  batch: typeof convertBatch !== 'undefined',
  cleanup: typeof cleanup !== 'undefined',
};

console.log('Available features:', features);
```

## Migration Guide

### From Turndown

```javascript
// Turndown
import TurndownService from 'turndown';
const turndownService = new TurndownService();
const markdown = turndownService.turndown(html);

// cash-out
import { convertToMarkdown } from 'cash-out';
const result = await convertToMarkdown(html);
const markdown = result.markdown;
```

### From remark-html

```javascript
// remark-html (parsing Markdown to HTML)

// cash-out (converting HTML to Markdown - opposite direction)
import { convertToMarkdown } from 'cash-out';
import { remark } from 'remark';
import html from 'remark-html';

const file = await remark().use(html).process(markdown);

const result = await convertToMarkdown(htmlString);
```

### Key Differences

1. **Async by Default**: cash-out uses async APIs in the browser for better performance
2. **Zero Dependencies**: No runtime dependencies to manage
3. **Built-in Security**: Automatic XSS protection and content sanitization
4. **Worker-Based**: Browser version uses Web Workers for non-blocking operation
5. **TypeScript Native**: Full type safety without separate type packages
