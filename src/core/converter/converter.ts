/**
 * Main HTML to Markdown converter
 * Supports conversion of HTML strings, Documents, and Elements
 */

import { sanitizeAttributes } from '@/core/security/sanitizer.js';
import { SafeDOMParser } from '@/core/parser/dom-parser.js';
import type {
  ConversionMetadata,
  ConversionOptions,
  MarkdownResult,
} from '@/types/html-to-markdown.js';
import type { DocumentLike, ElementLike, NodeLike, TextLike } from '@/types/dom.js';
import { NodeType } from '@/types/dom.js';
import { log } from '@/utilities/logger.js';
import { StructureOptimizer } from '@/core/optimizer/structure-optimizer.js';
import { normalizeWhitespace, normalizeUnicode, fixCommonIssues } from '@/core/optimizer/text-normalizer.js';
import { extractMetadata, calculateReadingTime } from '@/core/optimizer/metadata-extractor.js';
import { convertBlockquote } from './elements/blockquote.js';
import { convertCode } from './elements/code.js';
import { convertHeading } from './elements/heading.js';
import { convertImage } from './elements/image.js';
import { convertLink } from './elements/link.js';
import { convertList } from './elements/list.js';
import { convertTable } from './elements/table.js';
import { convertText } from './elements/text.js';
import { MarkdownBuilder } from './markdown-builder.js';

// Pre-compute constants to avoid repeated allocations
const SKIP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'iframe',
  'object',
  'embed',
  'applet',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'option',
  'meta',
  'link',
  'base',
  'head',
  'title',
]);

const INLINE_TAGS = new Set([
  'strong',
  'b',
  'em',
  'i',
  'code',
  'span',
  'a',
  'img',
  'br',
  'sub',
  'sup',
  'mark',
  'del',
  'ins',
]);

// Object pooling for frequently used objects
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: ((obj: T) => void) | undefined;

  constructor(createFn: () => T, resetFn?: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
  }

  get(): T {
    const obj = this.pool.pop();
    if (obj) {
      if (this.resetFn) {
        this.resetFn(obj);
      }
      return obj;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < 100) { // Limit pool size
      this.pool.push(obj);
    }
  }
}

// Pre-allocated pools
const arrayPool = new ObjectPool<NodeLike[]>(
  () => [],
  (arr) => { arr.length = 0; }
);

interface ProcessingFrame {
  node: NodeLike;
  depth: number;
  parent?: ElementLike;
}

export class HTMLToMarkdownConverter {
  private builder: MarkdownBuilder;
  private options: Required<ConversionOptions>;
  private startTime: number;
  private linkDeduplicator: Set<string>;
  private imageCount: number;
  private linkCount: number;
  private processedNodes: number;
  private parser: SafeDOMParser;

  constructor(options: ConversionOptions = {}) {
    this.builder = new MarkdownBuilder();
    this.options = {
      includeMetadata: options.includeMetadata ?? false,
      timeout: options.timeout ?? 30000, // 30 seconds
      maxInputSize: options.maxInputSize ?? 10 * 1024 * 1024,
      optimizationLevel: options.optimizationLevel ?? 'standard',
      optimizations: {
        normalizeHeadings: options.optimizations?.normalizeHeadings ?? true,
        flattenDeepNesting: options.optimizations?.flattenDeepNesting ?? true,
        removeRedundantFormatting: options.optimizations?.removeRedundantFormatting ?? true,
        mergeAdjacentElements: options.optimizations?.mergeAdjacentElements ?? true,
        simplifyTables: options.optimizations?.simplifyTables ?? true,
        deduplicateLinks: options.optimizations?.deduplicateLinks ?? true,
      },
    };
    this.startTime = performance.now();
    this.linkDeduplicator = new Set();
    this.imageCount = 0;
    this.linkCount = 0;
    this.processedNodes = 0;
    this.parser = new SafeDOMParser();
  }

  /**
   * Convert HTML input to Markdown
   * Accepts HTML string, Document, or Element
   */
  convert(input: string | DocumentLike | ElementLike): MarkdownResult {
    // Reset builder for each conversion
    this.builder = new MarkdownBuilder();
    
    let rootNode: NodeLike;
    let originalSize: number;
    let metadata: Partial<ConversionMetadata> = {};

    // Handle different input types
    if (typeof input === 'string') {
      // Parse HTML string
      const byteSize = new TextEncoder().encode(input).length;
      originalSize = byteSize;
      
      // Check if it's a fragment or full document
      const trimmed = input.trim();
      if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
        // Full document
        const doc = this.parser.parse(input);
        rootNode = doc.body || doc.documentElement;
        metadata = extractMetadata(doc);
      } else {
        // Fragment - wrap in minimal structure
        const wrappedHtml = `<!DOCTYPE html><html><body>${input}</body></html>`;
        const doc = this.parser.parse(wrappedHtml);
        rootNode = doc.body || doc.documentElement;
      }
    } else if (typeof input === 'object' && 'documentElement' in input) {
      // Document input
      const doc = input as DocumentLike;
      originalSize = new TextEncoder().encode(doc.documentElement.outerHTML).length;
      rootNode = doc.body || doc.documentElement;
      metadata = extractMetadata(doc);
    } else if (typeof input === 'object' && 'nodeType' in input) {
      // Element input
      const element = input as ElementLike;
      originalSize = new TextEncoder().encode(element.outerHTML).length;
      rootNode = element;
      // No document-level metadata for elements
    } else {
      throw new Error('cash-out: Invalid input type. Expected string, Document, or Element.');
    }

    if (!rootNode) {
      throw new Error('cash-out: No content found to convert');
    }

    // Apply structure optimizations before conversion
    if (this.shouldOptimize() && rootNode.nodeType === NodeType.ELEMENT_NODE) {
      const optimizer = new StructureOptimizer(this.getOptimizerOptions());
      optimizer.optimizeStructure(rootNode as ElementLike);
    }

    // Convert using optimized iterative traversal
    this.processNodeIteratively(rootNode);

    // Build the final markdown
    let markdown = this.builder.build();
    
    // Apply text normalizations
    if (this.shouldOptimize()) {
      markdown = normalizeWhitespace(markdown);
      markdown = normalizeUnicode(markdown);
      markdown = fixCommonIssues(markdown);
    }
    const outputSize = new TextEncoder().encode(markdown).length;

    // Calculate metadata
    let conversionTimeMs = performance.now() - this.startTime;
    if (conversionTimeMs <= 0) conversionTimeMs = 1;
    const wordCount = markdown.split(/\s+/).filter((word) => word.length > 0).length;

    const result: MarkdownResult = { markdown };

    if (this.options.includeMetadata) {
      const fullMetadata: ConversionMetadata = {
        ...metadata,
        wordCount,
        conversionTimeMs,
        originalSize,
        outputSize,
        linkCount: this.linkCount,
        imageCount: this.imageCount,
        readingTimeMinutes: calculateReadingTime(wordCount),
      };
      result.metadata = fullMetadata;
    }

    log.debug('Conversion complete', {
      wordCount,
      conversionTimeMs,
      processedNodes: this.processedNodes,
      compressionRatio: (outputSize / originalSize).toFixed(2),
    });

    return result;
  }

  /**
   * Process nodes using iterative traversal instead of recursion
   * This prevents stack overflow and is generally faster
   */
  private processNodeIteratively(rootNode: NodeLike): void {
    const stack: ProcessingFrame[] = [{ node: rootNode, depth: 0 }];
    
    while (stack.length > 0) {
      const frame = stack.pop()!;
      const { node, depth } = frame;
      
      this.processedNodes++;
      
      // Check timeout periodically (every 1000 nodes)
      if (this.processedNodes % 1000 === 0) {
        const now = performance.now();
        if (now - this.startTime > this.options.timeout) {
          throw new Error('cash-out: Conversion timeout');
        }
      }

      // Skip if nesting is too deep
      if (depth > 80) {
        continue;
      }

      // Process current node
      if (node.nodeType === NodeType.TEXT_NODE) {
        convertText(node as TextLike, this.builder);
        continue;
      }

      if (node.nodeType !== NodeType.ELEMENT_NODE) {
        continue;
      }

      const element = node as ElementLike;
      const tagName = element.tagName.toLowerCase();

      // Skip certain elements
      if (SKIP_TAGS.has(tagName)) {
        continue;
      }

      // Process element based on type
      const shouldProcessChildren = this.processElement(element, tagName, depth);

      // Add children to stack only if the element didn't handle them itself
      if (shouldProcessChildren && element.childNodes.length > 0 && depth < 80) {
        const children = arrayPool.get();
        
        // Collect children in reverse order for correct processing
        for (let i = element.childNodes.length - 1; i >= 0; i--) {
          const child = element.childNodes[i];
          if (child) {
            children.push(child);
          }
        }
        
        // Add to stack
        for (const child of children) {
          stack.push({ node: child, depth: depth + 1, parent: element });
        }
        
        arrayPool.release(children);
      }
    }
  }

  /**
   * Process a single element efficiently
   * @returns true if children should be processed by the iterative loop, false if element handled its own children
   */
  private processElement(element: ElementLike, tagName: string, depth: number): boolean {
    // Sanitize attributes only for elements that need it
    // Skip for deeply nested elements to avoid security check issues
    if ((tagName === 'a' || tagName === 'img' || tagName === 'iframe') && depth < 80) {
      sanitizeAttributes(element);
    }

    // Fast path for common elements
    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        convertHeading(element, this.builder);
        return false; // Element handles its own children

      case 'p':
        this.convertParagraphWithDeduplication(element);
        return false; // Element handles its own children

      case 'a':
        this.convertLinkWithDeduplication(element);
        return false; // Element handles its own children

      case 'img':
        convertImage(element, this.builder);
        this.imageCount++;
        return false; // Self-closing

      case 'code':
      case 'pre':
        convertCode(element, this.builder);
        return false; // Element handles its own children

      case 'blockquote':
        convertBlockquote(element, this.builder);
        return false; // Element handles its own children

      case 'ul':
      case 'ol':
        convertList(element, this.builder);
        return false; // Element handles its own children

      case 'table':
      case 'thead':
      case 'tbody':
      case 'tr':
      case 'td':
      case 'th':
        if (this.shouldSimplifyTable(element)) {
          this.convertTableToList(element);
        } else {
          convertTable(element, this.builder);
        }
        return false; // Element handles its own children

      case 'br':
        this.builder.add('  \n');
        return false; // Self-closing

      case 'hr':
        this.builder.addBlankLine().addLine('---').addBlankLine();
        return false; // Self-closing

      case 'strong':
      case 'b':
        this.builder.add('**');
        this.processInlineChildren(element);
        this.builder.add('**');
        return false;

      case 'em':
      case 'i':
        this.builder.add('_');
        this.processInlineChildren(element);
        this.builder.add('_');
        return false;

      case 'div':
      case 'section':
      case 'article':
      case 'main':
      case 'aside':
      case 'header':
      case 'footer':
        // Block elements - add spacing if needed
        if (this.needsBlockSpacing(element)) {
          this.builder.addBlankLine();
        }
        return true; // Let main loop process children

      case 'span':
      case 'mark':
      case 'del':
      case 'ins':
      case 'sub':
      case 'sup':
        // Inline elements - no special handling needed
        return true; // Let main loop process children

      default:
        // Unknown elements - let main loop process children
        return true;
    }
  }

  /**
   * Process inline children efficiently (for formatting elements)
   */
  private processInlineChildren(element: ElementLike): void {
    const childNodes = Array.isArray(element.childNodes) ? element.childNodes : Array.from(element.childNodes);
    for (const child of childNodes) {
      if (child.nodeType === NodeType.TEXT_NODE) {
        convertText(child as TextLike, this.builder);
      } else if (child.nodeType === NodeType.ELEMENT_NODE) {
        const childElement = child as ElementLike;
        const childTagName = childElement.tagName.toLowerCase();
        
        if (INLINE_TAGS.has(childTagName)) {
          this.processElement(childElement, childTagName, 0);
        }
      }
    }
  }

  /**
   * Check if block spacing is needed
   */
  private needsBlockSpacing(element: ElementLike): boolean {
    // Add spacing for block elements that contain block children
    const children = Array.isArray(element.children) ? element.children : Array.from(element.children);
    const hasBlockChildren = children.some(child => {
      const tagName = child.tagName.toLowerCase();
      return !INLINE_TAGS.has(tagName);
    });
    
    return hasBlockChildren;
  }

  /**
   * Convert paragraph with link deduplication
   */
  private convertParagraphWithDeduplication(element: ElementLike): void {
    const text = this.extractParagraphTextWithDeduplication(element).trim();
    
    if (text) {
      this.builder.addParagraph(text);
    }
  }

  /**
   * Extract text from paragraph, handling inline elements with link deduplication
   */
  private extractParagraphTextWithDeduplication(element: ElementLike): string {
    let text = '';
    
    const childNodes = Array.isArray(element.childNodes) ? element.childNodes : Array.from(element.childNodes);
    for (const node of childNodes) {
      if (node.nodeType === NodeType.TEXT_NODE) {
        text += node.textContent || '';
      } else if (node.nodeType === NodeType.ELEMENT_NODE) {
        const childElement = node as ElementLike;
        const tagName = childElement.tagName.toLowerCase();
        
        switch (tagName) {
          case 'strong':
          case 'b':
            text += `**${this.extractParagraphTextWithDeduplication(childElement)}**`;
            break;
            
          case 'em':
          case 'i':
            text += `_${this.extractParagraphTextWithDeduplication(childElement)}_`;
            break;
            
          case 'code':
            text += `\`${childElement.textContent || ''}\``;
            break;
            
          case 'a': {
            const href = childElement.getAttribute('href');
            const linkText = this.extractParagraphTextWithDeduplication(childElement);
            
            if (href && this.options.optimizations.deduplicateLinks) {
              // Check if we've seen this URL before
              if (this.linkDeduplicator.has(href)) {
                text += linkText;
                break;
              }
              
              this.linkDeduplicator.add(href);
              this.linkCount++;
            }
            
            text += href ? `[${linkText}](${href})` : linkText;
            break;
          }
            
          case 'br':
            text += '  \n';
            break;
            
          default:
            text += this.extractParagraphTextWithDeduplication(childElement);
        }
      }
    }
    
    return text;
  }

  /**
   * Convert link with deduplication
   */
  private convertLinkWithDeduplication(element: ElementLike): void {
    const href = element.getAttribute('href');
    const linkText = element.textContent?.trim() || '';
    
    if (href && this.options.optimizations.deduplicateLinks) {
      // Check if we've seen this URL before
      if (this.linkDeduplicator.has(href)) {
        // Just output the text without link
        this.builder.add(linkText);
        return;
      }
      
      this.linkDeduplicator.add(href);
    }

    convertLink(element, this.builder);
    this.linkCount++;
  }

  /**
   * Check if table should be simplified
   */
  private shouldSimplifyTable(element: ElementLike): boolean {
    if (!this.options.optimizations.simplifyTables) {
      return false;
    }

    // Simplify tables with > 5 columns or > 20 rows
    if (element.tagName.toLowerCase() === 'table') {
      const rows = element.querySelectorAll('tr');
      const rowsArray = Array.isArray(rows) ? rows : Array.from(rows);
      if (rowsArray.length > 20) return true;

      const firstRow = rowsArray[0] as ElementLike;
      if (firstRow) {
        const cells = firstRow.querySelectorAll('td, th');
        const cellsArray = Array.isArray(cells) ? cells : Array.from(cells);
        if (cellsArray.length > 5) return true;
      }
    }

    return false;
  }

  /**
   * Convert complex table to a simple list
   */
  private convertTableToList(element: ElementLike): void {
    this.builder.addBlankLine();
    const rows = element.querySelectorAll('tr');
    const rowsArray = Array.isArray(rows) ? rows : Array.from(rows);
    
    for (const row of rowsArray) {
      const rowElement = row as ElementLike;
      const cells = rowElement.querySelectorAll('td, th');
      const cellsArray = Array.isArray(cells) ? cells : Array.from(cells);
      if (cellsArray.length > 0) {
        this.builder.add('- ');
        for (let i = 0; i < cellsArray.length; i++) {
          if (i > 0) this.builder.add(' | ');
          const cell = cellsArray[i] as ElementLike;
          const cellText = cell?.textContent?.trim() || '';
          this.builder.add(cellText);
        }
        this.builder.addLine('');
      }
    }
    this.builder.addBlankLine();
  }

  /**
   * Check if optimizations should be applied
   */
  private shouldOptimize(): boolean {
    return this.options.optimizationLevel !== 'minimal';
  }

  /**
   * Get optimizer options based on current settings
   */
  private getOptimizerOptions() {
    return {
      maxNestingDepth: 5,
      flattenLists: this.options.optimizations.flattenDeepNesting ?? true,
      normalizeHeadings: this.options.optimizations.normalizeHeadings ?? true,
      removeRedundantFormatting: this.options.optimizations.removeRedundantFormatting ?? true,
      mergeAdjacentElements: this.options.optimizations.mergeAdjacentElements ?? true,
    };
  }
}