/**
 * Public type exports for html-to-markdown
 */

// Core conversion types
export type {
  ConversionOptions,
  ConversionMetadata,
  MarkdownResult,
  WorkerMessage,
  WorkerResponse,
} from './html-to-markdown.js';

// DOM compatibility types
export type {
  DOMParserLike,
  DocumentLike,
  ElementLike,
  NodeLike,
  TextLike,
  AttributeLike,
  HTMLCollectionLike,
  NodeListLike,
  DOMProvider,
} from './dom.js';

// Shared utility types
export type {
  Nullable,
  Optional,
  Maybe,
  AsyncFunction,
  SyncFunction,
  AnyFunction,
} from './shared.js';

// Re-export constants
export { NodeType } from './dom.js';

// Re-export type guards
export {
  isDocumentLike,
  isElementLike,
  isNodeLike,
  isTextLike,
} from './dom.js';