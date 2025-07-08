## HTML to Markdown Converter - Browser-First Requirements

### Product Overview

A high-performance, secure HTML to Markdown converter that runs entirely in the browser. Zero configuration required for excellent results, optimized for LLM consumption.

### Core Functionality

#### Input/Output

- [ ] **Input**: Raw HTML string via JavaScript API
- [ ] **Output**: Clean CommonMark-compliant Markdown
- [ ] **Processing**: Synchronous conversion using Web Workers for non-blocking operation
- [ ] **Limits**: 10MB max input size, no server-side dependencies

#### Default Conversion Rules

**Essential Elements Only:**

- [ ] Headings (h1-h6) → ATX-style headers (#, ##, etc.)
- [ ] Paragraphs → Double newline separation
- [ ] Bold/italic → **bold** and _italic_
- [ ] Links → [text](url) format, no title attributes
- [ ] Images → ![alt](src) or [Image: description] if no alt text
- [ ] Code blocks → Triple backticks with language detection
- [ ] Blockquotes → > prefix
- [ ] Lists → - for unordered, 1. for ordered
- [ ] Tables → Pipe tables (simplified for readability)
- [ ] Line breaks → Preserved only when semantically significant

**Automatic Removals:**

- [ ] All JavaScript and event handlers
- [ ] CSS styles and style blocks
- [ ] Comments and metadata
- [ ] Empty elements and excessive whitespace
- [ ] Navigation, headers, footers, sidebars (using readability heuristics)
- [ ] Advertisements and tracking pixels
- [ ] Form elements (converted to text description)
- [ ] Media embeds (converted to links)

### Performance Requirements

#### Speed Targets

- [ ] <50ms for documents under 100KB
- [ ] <200ms for documents under 1MB
- [ ] Linear scaling up to 10MB limit
- [ ] Non-blocking UI during conversion

#### Architecture

- [ ] WebAssembly module for core parsing logic
- [ ] Efficient string handling using TextEncoder/TextDecoder
- [ ] Single-pass parsing algorithm
- [ ] Minimal memory allocation
- [ ] Tree-shaking friendly module structure

### Security Requirements

#### Input Sanitization

- [ ] DOMParser API for safe HTML parsing
- [ ] No eval() or Function() constructor usage
- [ ] No innerHTML usage
- [ ] Sanitize all URLs before output
- [ ] Process in isolated Web Worker context

#### Attack Prevention

- [ ] XSS protection through DOM-based parsing only
- [ ] Memory limits enforced via Worker termination
- [ ] Stack overflow protection for deeply nested HTML
- [ ] Regex complexity limits
- [ ] No external resource fetching

### LLM Optimization (Built-in)

#### Automatic Structure Improvements

- [ ] Flatten deeply nested structures beyond 3 levels
- [ ] Merge adjacent text nodes
- [ ] Normalize heading hierarchy (no h1→h3 jumps)
- [ ] Convert complex tables to structured lists when >5 columns
- [ ] Remove redundant formatting (e.g., bold headers)
- [ ] Trim excessive newlines (max 2 consecutive)

#### Content Extraction

- [ ] Main content detection using readability algorithms
- [ ] Automatic removal of boilerplate content
- [ ] Link de-duplication
- [ ] Image caption extraction from surrounding context
- [ ] Smart list continuation after interruptions

### JavaScript API Design

#### Simple Interface

```javascript
// ES Module
import { convertToMarkdown } from 'html-to-markdown';

// Basic usage
const markdown = await convertToMarkdown(htmlString);

// With options (minimal)
const markdown = await convertToMarkdown(htmlString, {
  extractMainContent: true, // default: true
});

// Response includes metadata
const { markdown, metadata } = await convertToMarkdown(htmlString, {
  includeMetadata: true,
});
// metadata: { title, wordCount, conversionTimeMs }
```

#### Error Handling

- [ ] Throw specific error types (InvalidHTMLError, SizeLimitError, TimeoutError)
- [ ] Never expose system details in errors
- [ ] Graceful degradation for malformed HTML
- [ ] Clear error messages for developers

### Browser Compatibility

#### Target Environments

- [ ] Chrome/Edge 90+
- [ ] Firefox 90+
- [ ] Safari 14+
- [ ] Web Worker support required
- [ ] WebAssembly support required

#### Bundle Strategy

- [ ] UMD and ES module builds
- [ ] <100KB gzipped bundle size
- [ ] No polyfills included (modern browsers only)
- [ ] CDN-ready distribution

### Quality Guarantees

#### Built-in Validation

- [ ] Output always valid CommonMark
- [ ] No broken Markdown syntax
- [ ] Links validated for basic URL structure
- [ ] UTF-8 encoding enforced
- [ ] No control characters in output

#### Consistency

- [ ] Identical input always produces identical output
- [ ] No randomness in conversion
- [ ] Deterministic ordering of elements
- [ ] Stable across version updates

### Testing

#### Test Coverage

- [ ] 95%+ code coverage
- [ ] Browser-based test suite
- [ ] Performance benchmarks
- [ ] Memory leak detection
- [ ] Cross-browser testing automation

#### Test Cases

- [ ] Common websites (news, blogs, documentation)
- [ ] Malformed HTML edge cases
- [ ] Security payload testing
- [ ] Large document stress tests
- [ ] Unicode and emoji handling

### Distribution

#### Package Management

- [ ] NPM package with TypeScript definitions
- [ ] Unpkg/jsDelivr CDN hosting
- [ ] Source maps for debugging
- [ ] Minified production build
- [ ] Tree-shakeable exports

#### Documentation

- [ ] README with quick start
- [ ] API reference (JSDoc generated)
- [ ] Common usage examples
- [ ] Performance optimization tips
- [ ] Migration guide from server-side solutions

### Non-Features (Explicitly Not Supported)

- [ ] Node.js compatibility (browser-only)
- [ ] Configuration files
- [ ] Multiple Markdown flavors
- [ ] Custom conversion rules
- [ ] Plugin system
- [ ] Streaming API (use chunks instead)
- [ ] File system access
- [ ] Network requests

### Success Criteria

- [ ] Handles 95% of real-world HTML without configuration
- [ ] No security vulnerabilities reported
- [ ] <50ms conversion time for average web page
- [ ] Runs entirely offline after initial load
- [ ] <100KB total bundle size
- [ ] Works identically across all major browsers

This browser-first approach ensures fast, secure, and private HTML to Markdown conversion without any server dependencies.
