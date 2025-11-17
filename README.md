# Cash Out

A high-performance, secure HTML to Markdown converter that runs entirely in the browser, Node.js, and Web Workers. Zero configuration required for excellent results, optimized for LLM consumption.

**Also available as a browser extension!** Convert web pages to Markdown with a single click. [See Extension Documentation](#browser-extension)

[![npm version](https://badge.fury.io/js/cash-out.svg)](https://badge.fury.io/js/cash-out)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/cash-out)](https://bundlephobia.com/package/cash-out)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Fast**: <50ms for average web pages (100KB HTML)
- 🔒 **Secure**: DOMParser-only parsing, no eval() or innerHTML
- 🌐 **Universal**: Works in browsers, Node.js, Bun, and Web Workers
- 📦 **Lightweight**: <55KB total bundle size
- 🎯 **LLM-Optimized**: Clean output perfect for AI consumption
- ✨ **Zero Config**: Smart defaults that work for 95% of use cases
- 🔄 **Automatic Environment Detection**: Uses the best implementation for your runtime
- 💪 **TypeScript First**: Full type safety and excellent IDE support

## Installation

```bash
npm install cash-out
# or
yarn add cash-out
# or
bun add cash-out
```

## Quick Start

### Browser Usage

```javascript
import { convertToMarkdown } from 'cash-out';

// Convert HTML to Markdown
const result = await convertToMarkdown(htmlString);
console.log(result.markdown);

// With options
const result = await convertToMarkdown(htmlString, {
  includeMetadata: true,
  optimizationLevel: 'aggressive',
});

console.log(result.markdown);
console.log(result.metadata?.title);
console.log(result.metadata?.wordCount);
```

### Server Usage (Node.js/Bun)

```javascript
import {
  convertToMarkdown,
  htmlToMarkdown,
  initializeDOMProvider,
} from 'cash-out/server';
// Setup with Happy DOM (recommended)
import { Window } from 'happy-dom';

const window = new Window();

initializeDOMProvider({
  createParser: () => new window.DOMParser(),
  createDocument: () => window.document,
});

// Convert HTML to Markdown (async API)
const result = await convertToMarkdown(htmlString);

// Simple conversion (sync API, returns string)
const markdown = htmlToMarkdown(htmlString);

// Batch conversion
const results = convertBatch([
  '<h1>Doc 1</h1>',
  { html: '<h2>Doc 2</h2>', options: { includeMetadata: true } },
]);
```

### TypeScript Usage

```typescript
import { convertToMarkdown, type ConversionOptions, type MarkdownResult } from 'cash-out';

const options: ConversionOptions = {
  includeMetadata: true,
  timeout: 5000,
  maxInputSize: 10 * 1024 * 1024, // 10MB
  optimizationLevel: 'standard',
};

const result: MarkdownResult = await convertToMarkdown(htmlString, options);

// Access metadata with full type safety
if (result.metadata) {
  console.log(`Title: ${result.metadata.title}`);
  console.log(`Words: ${result.metadata.wordCount}`);
  console.log(`Conversion time: ${result.metadata.conversionTimeMs}ms`);
}
```

## API Reference

### Core Functions

#### `convertToMarkdown(html: string, options?: ConversionOptions): Promise<MarkdownResult>`

Converts HTML to Markdown with full options support. Available in all environments.

**Parameters:**

- `html` - The HTML string to convert
- `options` - Optional conversion configuration

**Returns:** Promise resolving to a MarkdownResult object

#### `htmlToMarkdown(html: string, options?: ConversionOptions): string`

Simple synchronous conversion. **Server-only** (Node.js/Bun).

**Returns:** Markdown string directly

#### `convertBatch(documents: Array<string | { html: string; options?: ConversionOptions }>): MarkdownResult[]`

Batch convert multiple documents. **Server-only** (Node.js/Bun).

**Returns:** Array of MarkdownResult objects

#### `cleanup(): void`

Clean up resources (terminates Web Workers). **Browser/Service Worker only**.

#### `initializeDOMProvider(provider: DOMProvider): void`

Initialize server environment with a DOM implementation. **Server-only**.

### Types

```typescript
interface ConversionOptions {
  // Extract main content using readability algorithms
  extractMainContent?: boolean; // default: true

  // Include metadata in response
  includeMetadata?: boolean; // default: false

  // Maximum conversion time in milliseconds
  timeout?: number; // default: 5000

  // Maximum input size in bytes
  maxInputSize?: number; // default: 10485760 (10MB)

  // Optimization level for output
  optimizationLevel?: 'none' | 'standard' | 'aggressive'; // default: 'standard'
}

interface MarkdownResult {
  markdown: string;
  metadata?: ConversionMetadata;
}

interface ConversionMetadata {
  title?: string;
  wordCount: number;
  conversionTimeMs: number;
  originalSize: number;
  outputSize: number;
}
```

### Error Types

- `InvalidHTMLError` - Thrown when HTML input is invalid or malformed
- `SizeLimitError` - Thrown when input exceeds size limits
- `ConversionTimeoutError` - Thrown when conversion takes too long
- `SecurityError` - Thrown when potentially malicious content is detected

## Advanced Usage

### CDN Usage

```html
<script type="module">
  import { convertToMarkdown } from 'https://cdn.jsdelivr.net/npm/cash-out/dist/browser.js';

  const markdown = await convertToMarkdown(document.body.innerHTML);
  console.log(markdown);
</script>
```

### Service Worker Usage

```javascript
// In your service worker
import { convertToMarkdown } from 'cash-out/browser';

self.addEventListener('message', async (event) => {
  if (event.data.type === 'cash-out:convert') {
    const result = await convertToMarkdown(event.data.html);
    event.ports[0].postMessage(result);
  }
});
```

### Custom DOM Provider (Server)

```javascript
import { convertToMarkdown } from 'cash-out/server';

// Use with jsdom
import { JSDOM } from 'jsdom';
const dom = new JSDOM();

const result = await convertToMarkdown(htmlString, {
  parser: new dom.window.DOMParser(),
});

// Use with linkedom
import { parseHTML } from 'linkedom';
const { document, DOMParser } = parseHTML('<!DOCTYPE html>');

const result = await convertToMarkdown(htmlString, {
  parser: new DOMParser(),
});
```

## Optimization Levels

- **`none`** - No optimization, preserves all structure
- **`standard`** - Balanced optimization (default)
  - Flattens deeply nested structures (>3 levels)
  - Merges adjacent text nodes
  - Removes redundant formatting
- **`aggressive`** - Maximum optimization for LLMs
  - Converts complex tables to lists (>5 columns)
  - Removes boilerplate content
  - Normalizes heading hierarchy
  - Simplifies complex structures

## Performance

Benchmarked on real-world HTML:

| Document Size | Conversion Time | Environment    |
| ------------- | --------------- | -------------- |
| 10KB          | <10ms           | Browser/Server |
| 100KB         | <50ms           | Browser/Server |
| 1MB           | <200ms          | Browser/Server |

_Browser conversions run in Web Workers for non-blocking operation._

## Security Features

- **Safe Parsing**: DOMParser API only - no innerHTML
- **XSS Protection**: Sanitizes all URLs and removes event handlers
- **Worker Isolation**: Runs in Web Worker for security and performance
- **Memory Limits**: Enforces size limits and timeout protection
- **No External Requests**: Pure transformation with no network access
- **Content Sanitization**: Strips dangerous protocols (javascript:, data:, etc.)

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+
- Node.js 18+
- Bun 1.0+

Requires Web Worker and ES Module support for browser usage.

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run tests with coverage
bun test:coverage

# Build for production
bun run build

# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format
```

## Browser Extension

Cash Out is also available as a browser extension for Chrome, Firefox, and Edge. Convert any webpage or selection to Markdown with a single click!

### Features

- 🔗 **One-Click Conversion**: Convert entire pages or selected text to Markdown
- 📋 **Auto-Copy to Clipboard**: Converted Markdown is automatically copied
- ⌨️ **Keyboard Shortcut**: Press `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac)
- 🎯 **Context Menu**: Right-click to convert from anywhere
- ⚙️ **Customizable**: Configure metadata, whitespace, and more
- 🚀 **Fast & Secure**: Same high-performance converter as the library

### Building the Extension

```bash
# Build for both Chrome and Firefox
bun run build:extension

# Build for specific browser
bun run build:extension:chrome   # Chrome/Edge
bun run build:extension:firefox  # Firefox
```

Output directories:
- `dist/chrome/` - Chrome/Edge extension (ready to load)
- `dist/firefox/` - Firefox extension (ready to load)

### Loading the Extension

**Chrome / Edge:**
1. Navigate to `chrome://extensions` (or `edge://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/chrome` directory

**Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `dist/firefox/manifest.json`

### Extension Documentation

For detailed extension documentation, see [src/extension/README.md](src/extension/README.md).

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Security

For security issues, please see our [Security Policy](SECURITY.md).

## License

MIT © Steve Kinney

## Comparison with Alternatives

| Feature            | Cash Out  | Turndown | remark-html |
| ------------------ | --------- | -------- | ----------- |
| Browser Support    | ✅        | ✅       | ❌          |
| Web Worker Support | ✅        | ❌       | ❌          |
| TypeScript         | ✅ Native | ⚠️ Types | ✅          |
| Bundle Size        | 55KB      | 40KB     | 200KB+      |
| Zero Dependencies  | ✅        | ❌       | ❌          |
| LLM Optimized      | ✅        | ❌       | ❌          |
| Security Features  | ✅        | ⚠️       | ⚠️          |

## Acknowledgments

Built with [Bun](https://bun.sh) for maximum performance.
