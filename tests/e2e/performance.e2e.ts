import { test, expect } from '@playwright/test';

// Define types for test results
interface ConversionResult {
  markdown: string;
  metadata?: unknown;
}

interface ConversionOptions {
  conversionTimeout?: number;
  maxInputSize?: number;
}

// Extend window interface for test functions
declare global {
  interface Window {
    convertToMarkdown: (html: string, options?: ConversionOptions) => Promise<ConversionResult>;
    cleanup: () => void;
    gc?: () => void;
  }
  
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle multiple concurrent conversions efficiently', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const concurrencyLevels = [5, 10, 20];
      const results = [];

      for (const concurrency of concurrencyLevels) {
        const startTime = performance.now();
        
        // Create different HTML content for each conversion
        const promises = Array.from({ length: concurrency }, (_, i) => {
          const html = `
            <h${(i % 6) + 1}>Document ${i}</h${(i % 6) + 1}>
            <p>This is paragraph ${i} with some <strong>bold text</strong> and <em>italic text</em>.</p>
            <ul>
              <li>Item ${i}-1</li>
              <li>Item ${i}-2</li>
              <li>Item ${i}-3</li>
            </ul>
            <blockquote>Quote ${i}: Performance testing in progress.</blockquote>
          `;
          return window.convertToMarkdown(html);
        });

        try {
          const markdownResults = await Promise.all(promises);
          const endTime = performance.now();
          const duration = endTime - startTime;

          results.push({
            concurrency,
            duration,
            throughput: concurrency / (duration / 1000), // conversions per second
            allSuccessful: markdownResults.every((result: ConversionResult, index: number) => 
              result.markdown.includes(`Document ${index}`)
            ),
            averagePerConversion: duration / concurrency
          });
        } catch (error) {
          results.push({
            concurrency,
            error: error instanceof Error ? error.message : String(error),
            failed: true
          });
        }
      }

      return results;
    });

    // All concurrency levels should succeed
    expect(result.every(r => !r.failed)).toBe(true);
    
    // Check that all conversions were successful
    expect(result.every(r => r.allSuccessful)).toBe(true);

    // Performance expectations (reasonable thresholds)
    result.forEach(r => {
      expect(r.duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(r.throughput).toBeGreaterThan(1); // At least 1 conversion per second
      expect(r.averagePerConversion).toBeLessThan(2000); // Average < 2 seconds per conversion
    });

    // Throughput should generally improve with worker pool
    const throughputs = result.map(r => r.throughput);
    expect(throughputs[1]).toBeGreaterThan((throughputs[0] || 0) * 0.8); // Allow some variance
  });

  test('should maintain performance with repeated conversions', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const iterations = 50;
      const durations: number[] = [];
      
      const testHTML = `
        <article>
          <h1>Performance Test Article</h1>
          <p>This is a test article with various elements to convert.</p>
          <h2>Section 1</h2>
          <p>Content with <a href="https://example.com">links</a> and <code>inline code</code>.</p>
          <pre><code>function test() {
    return "code block";
}</code></pre>
          <h2>Section 2</h2>
          <ul>
            <li>First item</li>
            <li>Second item</li>
            <li>Third item</li>
          </ul>
          <table>
            <tr><th>Name</th><th>Value</th></tr>
            <tr><td>Test</td><td>123</td></tr>
          </table>
        </article>
      `;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        try {
          const result = await window.convertToMarkdown(testHTML);
          const endTime = performance.now();
          
          durations.push(endTime - startTime);
          
          // Verify conversion quality doesn't degrade
          if (!result.markdown.includes('# Performance Test Article')) {
            throw new Error(`Conversion quality degraded at iteration ${i}`);
          }
        } catch (error) {
          return {
            failed: true,
            error: error instanceof Error ? error.message : String(error),
            failedAtIteration: i
          };
        }
      }

      // Calculate statistics
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      const stdDev = Math.sqrt(
        durations.reduce((sum, duration) => sum + Math.pow(duration - avgDuration, 2), 0) / durations.length
      );

      return {
        iterations,
        avgDuration,
        minDuration,
        maxDuration,
        stdDev,
        consistentPerformance: (maxDuration - minDuration) < (avgDuration * 2), // Max should not be more than 2x avg
        allIterationsCompleted: durations.length === iterations
      };
    });

    expect(result.failed).toBeFalsy();
    expect(result.allIterationsCompleted).toBe(true);
    expect(result.avgDuration).toBeLessThan(1000); // Average should be under 1 second
    expect(result.consistentPerformance).toBe(true);
    expect(result.stdDev).toBeLessThan(result.avgDuration || 0); // Standard deviation should be reasonable
  });

  test('should efficiently handle large documents', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const documentSizes = [
        { name: 'Small', elements: 10 },
        { name: 'Medium', elements: 100 },
        { name: 'Large', elements: 500 }
      ];

      const results = [];

      for (const size of documentSizes) {
        // Generate HTML with specified number of elements
        let html = '<article><h1>Large Document Test</h1>';
        
        for (let i = 0; i < size.elements; i++) {
          html += `
            <h${(i % 6) + 1}>Section ${i}</h${(i % 6) + 1}>
            <p>This is paragraph ${i} with content. It contains <strong>bold</strong> and <em>italic</em> text.</p>
          `;
          
          if (i % 10 === 0) {
            html += `
              <ul>
                <li>List item ${i}-1</li>
                <li>List item ${i}-2</li>
              </ul>
            `;
          }
          
          if (i % 20 === 0) {
            html += `
              <table>
                <tr><th>Col1</th><th>Col2</th></tr>
                <tr><td>Data ${i}</td><td>Value ${i}</td></tr>
              </table>
            `;
          }
        }
        
        html += '</article>';
        
        const htmlSize = new TextEncoder().encode(html).length;
        
        // Skip if too large (would hit size limit)
        if (htmlSize > 5 * 1024 * 1024) { // 5MB limit for this test
          results.push({
            name: size.name,
            elements: size.elements,
            skipped: true,
            reason: 'Too large for test'
          });
          continue;
        }

        const startTime = performance.now();
        
        try {
          const markdown = await window.convertToMarkdown(html);
          const endTime = performance.now();
          
          const duration = endTime - startTime;
          const outputSize = new TextEncoder().encode(markdown.markdown).length;
          
          results.push({
            name: size.name,
            elements: size.elements,
            inputSize: htmlSize,
            outputSize,
            duration,
            throughputMBps: (htmlSize / (1024 * 1024)) / (duration / 1000),
            elementsPerSecond: size.elements / (duration / 1000),
            compressionRatio: outputSize / htmlSize,
            success: true
          });
        } catch (error) {
          results.push({
            name: size.name,
            elements: size.elements,
            error: error instanceof Error ? error.message : String(error),
            failed: true
          });
        }
      }

      return results;
    });

    // All non-skipped tests should succeed
    const nonSkippedResults = result.filter(r => !r.skipped);
    expect(nonSkippedResults.every(r => !r.failed)).toBe(true);

    // Performance should scale reasonably with document size
    nonSkippedResults.forEach(r => {
      expect(r.duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(r.elementsPerSecond).toBeGreaterThan(10); // At least 10 elements per second
      expect(r.compressionRatio).toBeLessThan(2); // Markdown shouldn't be much larger than HTML
    });

    // Throughput should be reasonable
    const mediumResult = nonSkippedResults.find(r => r.name === 'Medium');
    if (mediumResult) {
      expect(mediumResult.throughputMBps).toBeGreaterThan(0.1); // At least 0.1 MB/s
    }
  });

  test('should handle worker pool under stress', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Test rapid fire requests that exceed worker pool size
      const totalRequests = 50;
      const batchSize = 10;
      const results = [];

      const testHTML = '<h1>Stress Test</h1><p>Worker pool stress testing</p>';

      for (let batch = 0; batch < totalRequests / batchSize; batch++) {
        const batchStartTime = performance.now();
        
        // Fire off batch requests simultaneously
        const batchPromises = Array.from({ length: batchSize }, (_, i) => {
          const requestId = batch * batchSize + i;
          const html = `${testHTML}<p>Request ${requestId}</p>`;
          return window.convertToMarkdown(html);
        });

        try {
          const batchResults = await Promise.all(batchPromises);
          const batchEndTime = performance.now();
          
          const batchDuration = batchEndTime - batchStartTime;
          const allValid = batchResults.every((result, i) => {
            const requestId = batch * batchSize + i;
            return result.markdown.includes(`Request ${requestId}`);
          });

          results.push({
            batch,
            duration: batchDuration,
            throughput: batchSize / (batchDuration / 1000),
            allValid,
            success: true
          });
          
          // Brief pause between batches to let worker pool settle
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          results.push({
            batch,
            error: error instanceof Error ? error.message : String(error),
            failed: true
          });
        }
      }

      const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
      const avgThroughput = results
        .filter(r => !r.failed)
        .reduce((sum, r) => sum + (r.throughput || 0), 0) / results.filter(r => !r.failed).length;

      return {
        batches: results,
        totalRequests,
        totalDuration,
        avgThroughput,
        allBatchesSucceeded: results.every(r => !r.failed),
        allResultsValid: results.every(r => r.allValid !== false)
      };
    });

    expect(result.allBatchesSucceeded).toBe(true);
    expect(result.allResultsValid).toBe(true);
    expect(result.avgThroughput).toBeGreaterThan(5); // At least 5 conversions per second on average
    expect(result.totalDuration).toBeLessThan(30000); // Should complete within 30 seconds
  });

  test('should maintain memory efficiency', async ({ page }) => {
    // Note: This test checks for basic memory patterns, not exact memory usage
    const result = await page.evaluate(async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      const iterations = 20;
      const memorySnapshots = [];

      const testHTML = `
        <div>
          <h1>Memory Test</h1>
          <p>${'Content '.repeat(1000)}</p>
          <ul>${'<li>Item</li>'.repeat(100)}</ul>
        </div>
      `;

      for (let i = 0; i < iterations; i++) {
        await window.convertToMarkdown(testHTML);
        
        // Take memory snapshot if available
        if (performance.memory) {
          memorySnapshots.push(performance.memory.usedJSHeapSize);
        }
        
        // Force garbage collection if available (Chrome)
        if (window.gc) {
          window.gc();
        }
      }

      // Clean up workers
      window.cleanup();

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      
      return {
        iterations,
        initialMemory,
        finalMemory,
        memoryGrowth: finalMemory - initialMemory,
        memorySnapshots,
        hasMemoryAPI: !!performance.memory,
        memoryEfficient: memorySnapshots.length === 0 || 
          (Math.max(...memorySnapshots) - Math.min(...memorySnapshots)) < initialMemory * 0.5 // Less than 50% growth
      };
    });

    expect(result.iterations).toBe(20);
    
    // If memory API is available, check for reasonable memory usage
    if (result.hasMemoryAPI) {
      expect(result.memoryEfficient).toBe(true);
      // Memory growth should be reasonable (less than 50MB)
      expect(result.memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    }
  });
});