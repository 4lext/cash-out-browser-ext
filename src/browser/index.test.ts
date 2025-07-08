/**
 * Tests for browser API
 */

import { describe, it, expect, afterEach, beforeAll } from 'bun:test';
import { convertToMarkdown, cleanup, InvalidHTMLError, SizeLimitError } from './index.js';

// Setup DOM globals
import '@/test/dom-setup.ts';

// Mock Worker for testing
class MockWorker {
  private listeners = new Map<string, Array<(event: any) => void>>();
  
  constructor(_url: string | URL, _options?: any) {
    // Initialize worker with a delay to simulate async loading
    setTimeout(() => {
      this.dispatchEvent(new Event('load'));
    }, 0);
  }
  
  postMessage(message: any): void {
    // Import the service worker implementation for processing
    void import('./service-worker.js').then(({ convertToMarkdown: swConvert }) => {
      setTimeout(async () => {
        try {
          const result = await swConvert(message.html, message.options);
          const response = {
            type: 'cash-out:result' as const,
            id: message.id,
            result,
          };
          this.dispatchEvent(new MessageEvent('message', { data: response }));
        } catch (error) {
          const response = {
            type: 'cash-out:error' as const,
            id: message.id,
            error: {
              name: error instanceof Error ? error.name : 'Error',
              message: error instanceof Error ? error.message : 'Unknown error',
              code: error instanceof InvalidHTMLError ? 'INVALID_HTML' : 'UNKNOWN_ERROR',
            },
          };
          this.dispatchEvent(new MessageEvent('message', { data: response }));
        }
      }, 10);
    });
  }
  
  addEventListener(type: string, listener: (event: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }
  
  removeEventListener(type: string, listener: (event: any) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  dispatchEvent(event: any): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
    return true;
  }
  
  terminate(): void {
    this.listeners.clear();
  }
}


describe('Browser API', () => {
  beforeAll(() => {
    // Mock Worker constructor for testing
    (globalThis as any).Worker = MockWorker;
    
    // Mock crypto.randomUUID
    (globalThis as any).crypto = {
      randomUUID: () => Math.random().toString(36).substring(2, 15),
    };
  });
  
  afterEach(() => {
    cleanup();
  });

  describe('convertToMarkdown', () => {
    it('converts simple HTML to markdown', async () => {
      const html = '<h1>Hello World</h1><p>This is a test.</p>';
      const result = await convertToMarkdown(html);
      
      expect(result.markdown).toContain('# Hello World');
      expect(result.markdown).toContain('This is a test.');
    });

    it('respects size limits', async () => {
      const largeHTML = '<p>' + 'a'.repeat(1024 * 1024) + '</p>';
      
      try {
        await convertToMarkdown(largeHTML, { maxInputSize: 1024 }); // 1KB limit
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(SizeLimitError);
      }
    });

    it('includes metadata when requested', async () => {
      const html = '<h1>Test Document</h1><p>Some content here.</p>';
      const result = await convertToMarkdown(html, { includeMetadata: true });
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.wordCount).toBeGreaterThan(0);
      expect(result.metadata?.conversionTimeMs).toBeGreaterThan(0);
    });

    it('handles concurrent conversions', async () => {
      const html1 = '<h1>Document 1</h1>';
      const html2 = '<h2>Document 2</h2>';
      const html3 = '<h3>Document 3</h3>';
      
      const [result1, result2, result3] = await Promise.all([
        convertToMarkdown(html1),
        convertToMarkdown(html2),
        convertToMarkdown(html3),
      ]);
      
      expect(result1.markdown).toBeDefined();
      expect(result2.markdown).toBeDefined();
      expect(result3.markdown).toBeDefined();
    });

    it('handles empty HTML', async () => {
      const result = await convertToMarkdown('');
      expect(result.markdown).toBe('');
    });

    it('handles HTML fragments', async () => {
      const fragment = 'Just some text without tags';
      const result = await convertToMarkdown(fragment);
      expect(result.markdown).toBeDefined();
    });
  });

  describe('Worker pool', () => {
    it('reuses workers for multiple conversions', async () => {
      const conversions = [];
      
      // Create many conversions to test worker reuse
      for (let i = 0; i < 10; i++) {
        conversions.push(convertToMarkdown(`<p>Test ${i}</p>`));
      }
      
      const results = await Promise.all(conversions);
      
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.markdown).toBeDefined();
      });
    });

    it('handles worker errors gracefully', async () => {
      // Simulate a conversion that would cause an error
      const malformedHTML = '<p>Test with potential error</p>';
      
      // Should not throw - worker errors are handled
      const result = await convertToMarkdown(malformedHTML);
      expect(result.markdown).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('propagates InvalidHTMLError from worker', async () => {
      // Mock worker to return an error
      const originalWorker = (global as any).Worker;
      
      class ErrorMockWorker {
        private listeners = new Map<string, Array<(event: any) => void>>();
        
        constructor(_url: string | URL, _options?: any) {
          setTimeout(() => {
            this.dispatchEvent(new Event('load'));
          }, 0);
        }
        
        postMessage(message: any): void {
          setTimeout(() => {
            const response = {
              type: 'cash-out:error' as const,
              id: message.id,
              error: {
                name: 'InvalidHTMLError',
                message: 'Invalid HTML',
                code: 'INVALID_HTML',
              },
            };
            
            const event = new MessageEvent('message', { data: response });
            this.dispatchEvent(event);
          }, 10);
        }
        
        addEventListener(type: string, listener: (event: any) => void): void {
          if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
          }
          this.listeners.get(type)!.push(listener);
        }
        
        removeEventListener(type: string, listener: (event: any) => void): void {
          const listeners = this.listeners.get(type);
          if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        }
        
        dispatchEvent(event: any): boolean {
          const listeners = this.listeners.get(event.type);
          if (listeners) {
            for (const listener of listeners) {
              listener(event);
            }
          }
          return true;
        }
        
        terminate(): void {
          this.listeners.clear();
        }
      }
      
      (global as any).Worker = ErrorMockWorker;
      
      try {
        await convertToMarkdown('<invalid>');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidHTMLError);
      } finally {
        // Always restore original Worker
        (global as any).Worker = originalWorker;
      }
    });
  });

  describe('Options', () => {
    it('passes options to worker', async () => {
      const options = {
        includeMetadata: true,
        timeout: 10000,
        maxInputSize: 5 * 1024 * 1024,
      };
      
      const result = await convertToMarkdown('<p>Test</p>', options);
      expect(result).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('terminates workers on cleanup', async () => {
      // Perform a conversion to initialize worker pool
      await convertToMarkdown('<p>Test</p>');
      
      // Cleanup should terminate all workers
      expect(() => cleanup()).not.toThrow();
      
      // Can still convert after cleanup (new pool created)
      const result = await convertToMarkdown('<p>After cleanup</p>');
      expect(result.markdown).toBeDefined();
    });
  });
});