import { test, expect } from '@playwright/test';
import type { ConsoleMessage } from '@playwright/test';

// Define types for test results
interface ConversionResult {
  markdown: string;
  metadata?: unknown;
}

interface ConversionOptions {
  conversionTimeout?: number;
  maxInputSize?: number;
}

interface ConversionError extends Error {
  code?: string;
}

// WorkerTestResult interface removed as it was unused

interface WorkerMessage {
  type: string;
  html?: string;
  options?: Record<string, unknown>;
  id?: string;
}

// Extend window interface for test functions
declare global {
  interface Window {
    convertToMarkdown: (html: string, options?: ConversionOptions) => Promise<ConversionResult>;
    capturedWorkerMessages?: WorkerMessage[];
    Worker: typeof Worker;
  }
}

test.describe('Worker Communication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should verify worker message prefixes', async ({ page }) => {
    let workerMessages: string[] = [];
    
    // Capture console messages
    page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text();
      if (text.includes('cash-out:')) {
        workerMessages.push(text);
      }
    });

    // Trigger a conversion to initialize workers
    const result = await page.evaluate(async () => {
      const html = '<p>Test message prefixing</p>';
      const markdown = await window.convertToMarkdown(html);
      return markdown.markdown;
    });

    expect(result).toContain('Test message prefixing');
    
    // Check that worker initialization message contains the prefix
    const hasWorkerInitMessage = workerMessages.some(msg => 
      msg.includes('cash-out:') && msg.includes('Worker initialized')
    );
    expect(hasWorkerInitMessage).toBe(true);
  });

  test('should handle worker errors correctly', async ({ page }) => {
    // Test worker error handling by attempting conversion with potential issues
    const result = await page.evaluate(async () => {
      try {
        // Test with extremely complex nested HTML that might cause worker issues
        const complexHTML = `
          <div>${'<div>'.repeat(1000)}
            <p>Deep nesting test</p>
          ${'</div>'.repeat(1000)}</div>
        `;
        
        const markdown = await window.convertToMarkdown(complexHTML);
        return { success: true, content: markdown.markdown };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorCode: (error as ConversionError)?.code || 'UNKNOWN' 
        };
      }
    });

    // Should either succeed or fail with a proper error structure
    expect(typeof result.success).toBe('boolean');
    
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(typeof result.errorName).toBe('string');
    }
  });

  test('should maintain worker pool functionality', async ({ page }) => {
    // Test that multiple rapid conversions work correctly
    const results = await page.evaluate(async () => {
      const promises = [];
      const testData = [];
      
      // Create 10 rapid conversions
      for (let i = 0; i < 10; i++) {
        const html = `<h${(i % 6) + 1}>Test ${i}</h${(i % 6) + 1}><p>Content ${i}</p>`;
        promises.push(window.convertToMarkdown(html));
        testData.push(`Test ${i}`);
      }
      
      try {
        const markdownResults = await Promise.all(promises);
        return {
          success: true,
          count: markdownResults.length,
          allContainExpectedContent: markdownResults.every((result: ConversionResult, index: number) => 
            result.markdown.includes(`Test ${index}`)
          ),
          sampleResult: markdownResults[0]?.markdown || ''
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    expect(results.success).toBe(true);
    expect(results.count).toBe(10);
    expect(results.allContainExpectedContent).toBe(true);
  });

  test('should verify worker message types are correctly prefixed', async ({ page }) => {
    
    // Override Worker.postMessage to capture messages
    await page.addInitScript(() => {
      const originalWorker = window.Worker;
      window.Worker = class extends originalWorker {
        constructor(scriptURL: string | URL, options?: WorkerOptions) {
          super(scriptURL, options);
          
          const originalPostMessage = this.postMessage;
          this.postMessage = function(message: unknown) {
            // Capture messages sent to workers
            window.capturedWorkerMessages = window.capturedWorkerMessages || [];
            window.capturedWorkerMessages.push(message as WorkerMessage);
            return originalPostMessage.call(this, message);
          };
        }
      };
    });

    // Perform a conversion
    await page.evaluate(async () => {
      const html = '<p>Testing worker message types</p>';
      await window.convertToMarkdown(html);
    });

    // Check captured messages
    const capturedMessages = await page.evaluate(() => {
      return window.capturedWorkerMessages || [];
    });

    expect(capturedMessages.length).toBeGreaterThan(0);
    
    // Verify that messages have the correct structure and type prefix
    const hasCorrectMessageType = capturedMessages.some((msg: WorkerMessage) => 
      msg && msg.type === 'cash-out:convert'
    );
    expect(hasCorrectMessageType).toBe(true);

    // Verify message structure
    const convertMessage = capturedMessages.find((msg: WorkerMessage) => 
      msg && msg.type === 'cash-out:convert'
    );
    
    if (convertMessage) {
      expect(convertMessage).toHaveProperty('html');
      expect(convertMessage).toHaveProperty('options');
      expect(convertMessage).toHaveProperty('id');
      expect(typeof convertMessage.id).toBe('string');
    }
  });

  test('should handle worker pool initialization correctly', async ({ page }) => {
    // Test that worker pool initializes properly on first use
    const result = await page.evaluate(async () => {
      // First conversion should initialize the worker pool
      const html1 = '<p>First conversion</p>';
      const result1 = await window.convertToMarkdown(html1);
      
      // Second conversion should reuse the pool
      const html2 = '<p>Second conversion</p>';
      const result2 = await window.convertToMarkdown(html2);
      
      return {
        first: result1.markdown,
        second: result2.markdown,
        bothSuccessful: result1.markdown.includes('First conversion') && 
                       result2.markdown.includes('Second conversion')
      };
    });

    expect(result.bothSuccessful).toBe(true);
    expect(result.first).toContain('First conversion');
    expect(result.second).toContain('Second conversion');
  });
});