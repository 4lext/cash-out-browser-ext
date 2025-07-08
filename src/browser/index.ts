/**
 * Browser entry point for HTML to Markdown converter
 */

import type { ConversionOptions, MarkdownResult, WorkerMessage, WorkerResponse } from '@/types/html-to-markdown.js';
import { InvalidHTMLError, SizeLimitError, ConversionTimeoutError } from '@/errors/converter-errors.js';

// Worker pool for better performance
class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private pendingTasks: Array<{
    resolve: (result: MarkdownResult) => void;
    reject: (error: Error) => void;
    message: WorkerMessage;
  }> = [];

  constructor(private size: number = 4) {
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
      });

      worker.addEventListener('message', this.handleWorkerMessage.bind(this, worker));
      worker.addEventListener('error', this.handleWorkerError.bind(this, worker));

      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  private handleWorkerMessage(worker: Worker, event: MessageEvent<WorkerResponse>): void {
    const response = event.data;
    const taskIndex = this.pendingTasks.findIndex(task => task.message.id === response.id);

    if (taskIndex === -1) return;

    const task = this.pendingTasks[taskIndex];
    if (!task) return;
    this.pendingTasks.splice(taskIndex, 1);

    // Return worker to pool
    this.availableWorkers.push(worker);

    // Process next task if any
    this.processNextTask();

    // Resolve or reject the promise
    if (response.type === 'cash-out:result' && response.result) {
      task.resolve(response.result);
    } else if (response.type === 'cash-out:error' && response.error) {
      const error = this.createErrorFromResponse(response.error);
      task.reject(error);
    }
  }

  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    console.error('cash-out: Worker error:', error);
    
    // Remove worker from available pool
    const index = this.availableWorkers.indexOf(worker);
    if (index > -1) {
      this.availableWorkers.splice(index, 1);
    }

    // Create a new worker to replace the failed one
    const newWorker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
    });
    
    newWorker.addEventListener('message', this.handleWorkerMessage.bind(this, newWorker));
    newWorker.addEventListener('error', this.handleWorkerError.bind(this, newWorker));
    
    this.workers.push(newWorker);
    this.availableWorkers.push(newWorker);
  }

  private createErrorFromResponse(error: { name: string; message: string; code: string }): Error {
    switch (error.code) {
      case 'INVALID_HTML':
        return new InvalidHTMLError(error.message);
      case 'SIZE_LIMIT_EXCEEDED':
        return new SizeLimitError(0, 0); // Will be overridden by message
      case 'CONVERSION_TIMEOUT':
        return new ConversionTimeoutError(0); // Will be overridden by message
      default:
        return new Error(error.message);
    }
  }

  async convert(html: string, options?: ConversionOptions): Promise<MarkdownResult> {
    const message: WorkerMessage = {
      type: 'cash-out:convert',
      html,
      options: options || {},
      id: crypto.randomUUID(),
    };

    return new Promise((resolve, reject) => {
      this.pendingTasks.push({ resolve, reject, message });
      this.processNextTask();
    });
  }

  private processNextTask(): void {
    if (this.pendingTasks.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    const worker = this.availableWorkers.pop()!;
    const task = this.pendingTasks[0];
    if (!task) return;

    worker.postMessage(task.message);
  }

  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.availableWorkers = [];
    this.pendingTasks = [];
  }
}

// Global worker pool instance
let workerPool: WorkerPool | null = null;

/**
 * Convert HTML to Markdown
 * Main public API function
 */
export async function convertToMarkdown(
  html: string,
  options?: ConversionOptions
): Promise<MarkdownResult> {
  // Initialize worker pool on first use
  if (!workerPool) {
    workerPool = new WorkerPool();
  }

  // Validate input size on main thread
  const byteSize = new TextEncoder().encode(html).length;
  const maxSize = options?.maxInputSize ?? 10 * 1024 * 1024;

  if (byteSize > maxSize) {
    throw new SizeLimitError(byteSize, maxSize);
  }

  // Convert using worker pool
  return workerPool.convert(html, options);
}

/**
 * Clean up resources
 */
export function cleanup(): void {
  if (workerPool) {
    workerPool.terminate();
    workerPool = null;
  }
}

// Export types for convenience
export type { ConversionOptions, MarkdownResult, ConversionMetadata } from '@/types/html-to-markdown.js';
export { InvalidHTMLError, SizeLimitError, ConversionTimeoutError, SecurityError } from '@/errors/converter-errors.js';