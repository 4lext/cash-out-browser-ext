/**
 * Shared utility types for html-to-markdown
 */

// Nullable and optional types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Function types
export type AsyncFunction<T = unknown> = (...args: unknown[]) => Promise<T>;
export type SyncFunction<T = unknown> = (...args: unknown[]) => T;
export type AnyFunction = AsyncFunction | SyncFunction;