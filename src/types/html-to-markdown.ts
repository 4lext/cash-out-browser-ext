/**
 * Public API types for the HTML to Markdown converter
 */

export interface ConversionOptions {
  /**
   * Include metadata in the response
   * @default false
   */
  includeMetadata?: boolean;

  /**
   * Maximum time allowed for conversion in milliseconds
   * @default 5000
   */
  timeout?: number;

  /**
   * Maximum input size in bytes
   * @default 10485760 (10MB)
   */
  maxInputSize?: number;

  /**
   * Optimization level for LLM-friendly output
   * @default 'standard'
   */
  optimizationLevel?: 'minimal' | 'standard' | 'aggressive';

  /**
   * Enable specific optimizations
   */
  optimizations?: {
    normalizeHeadings?: boolean;
    flattenDeepNesting?: boolean;
    removeRedundantFormatting?: boolean;
    mergeAdjacentElements?: boolean;
    simplifyTables?: boolean;
    deduplicateLinks?: boolean;
  };
}

export interface MarkdownResult {
  /**
   * The converted Markdown content
   */
  markdown: string;

  /**
   * Optional metadata about the conversion
   */
  metadata?: ConversionMetadata;
}

export interface ConversionMetadata {
  /**
   * Extracted title from the document
   */
  title?: string;

  /**
   * Meta description if found
   */
  description?: string;

  /**
   * Author information if found
   */
  author?: string;

  /**
   * Publication date if found
   */
  publishDate?: string;

  /**
   * Detected language
   */
  language?: string;

  /**
   * Word count of the converted content
   */
  wordCount: number;

  /**
   * Estimated reading time in minutes
   */
  readingTimeMinutes?: number;

  /**
   * Time taken for conversion in milliseconds
   */
  conversionTimeMs: number;

  /**
   * Original HTML size in bytes
   */
  originalSize: number;

  /**
   * Markdown output size in bytes
   */
  outputSize: number;

  /**
   * Number of links found
   */
  linkCount?: number;

  /**
   * Number of images found
   */
  imageCount?: number;
}

export interface WorkerMessage {
  type: 'cash-out:convert';
  html: string;
  options?: ConversionOptions;
  id: string;
}

export interface WorkerResponse {
  type: 'cash-out:result' | 'cash-out:error';
  id: string;
  result?: MarkdownResult;
  error?: {
    name: string;
    message: string;
    code: string;
  };
}