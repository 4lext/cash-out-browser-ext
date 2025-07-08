import { test, expect } from '@playwright/test';

// Define types for test results
interface ConversionResult {
  markdown: string;
  metadata?: unknown;
}

// Define conversion options
interface ConversionOptions {
  conversionTimeout?: number;
  maxInputSize?: number;
}

// Extend window interface for test functions
declare global {
  interface Window {
    convertToMarkdown: (html: string, options?: ConversionOptions) => Promise<ConversionResult>;
  }
}

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should enforce size limits and throw SizeLimitError', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        // Create HTML larger than the default 10MB limit
        const largeContent = 'x'.repeat(11 * 1024 * 1024);
        const largeHTML = `<p>${largeContent}</p>`;
        
        await window.convertToMarkdown(largeHTML);
        return { success: true, shouldNotReachHere: true };
      } catch (error) {
        return {
          success: false,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          hasExpectedError: error instanceof Error && error.name === 'SizeLimitError'
        };
      }
    });

    expect(result.success).toBe(false);
    expect(result.hasExpectedError).toBe(true);
    expect(result.errorName).toBe('SizeLimitError');
    expect(result.errorMessage).toContain('exceeds maximum allowed size');
  });

  test('should respect custom size limits', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        // Create HTML that exceeds a custom 1KB limit
        const content = 'x'.repeat(2048); // 2KB
        const html = `<p>${content}</p>`;
        
        const options = { maxInputSize: 1024 }; // 1KB limit
        
        await window.convertToMarkdown(html, options);
        return { success: true, shouldNotReachHere: true };
      } catch (error) {
        return {
          success: false,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          hasExpectedError: error instanceof Error && error.name === 'SizeLimitError'
        };
      }
    });

    expect(result.success).toBe(false);
    expect(result.hasExpectedError).toBe(true);
    expect(result.errorName).toBe('SizeLimitError');
  });

  test('should handle malformed HTML gracefully', async ({ page }) => {
    const testCases = [
      '<div><p>Unclosed div and paragraph',
      '<script>alert("xss")</script><p>Should be sanitized</p>',
      '<img src="javascript:alert(1)" alt="XSS attempt">',
      '<a href="javascript:void(0)">Suspicious link</a>',
      '<<>invalid<<>>tags<</p>',
      '<div class="test" onclick="alert(1)">Event handler</div>'
    ];

    for (const testHTML of testCases) {
      const result = await page.evaluate(async (html) => {
        try {
          const markdown = await window.convertToMarkdown(html);
          return {
            success: true,
            content: markdown.markdown,
            containsScript: markdown.markdown.toLowerCase().includes('script'),
            containsJavaScript: markdown.markdown.toLowerCase().includes('javascript')
          };
        } catch (error) {
          return {
            success: false,
            errorName: error instanceof Error ? error.name : 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error)
          };
        }
      }, testHTML);

      // Should either succeed (with sanitized content) or fail gracefully
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        // Security check: should not contain dangerous content
        expect(result.containsScript).toBe(false);
        expect(result.containsJavaScript).toBe(false);
        expect(typeof result.content).toBe('string');
      } else {
        // If it fails, should have proper error info
        expect(typeof result.errorName).toBe('string');
        expect(typeof result.errorMessage).toBe('string');
      }
    }
  });

  test('should handle worker errors and recover', async ({ page }) => {
    let consoleErrors: string[] = [];
    
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const result = await page.evaluate(async () => {
      try {
        // Create potentially problematic content
        const problematicHTML = `
          <div>${'<div>'.repeat(500)}
            <script>throw new Error('Worker should handle this');</script>
            <p>Content after potential error</p>
          ${'</div>'.repeat(500)}</div>
        `;
        
        const markdown = await window.convertToMarkdown(problematicHTML);
        
        // Try another conversion to ensure workers are still functional
        const simpleHTML = '<p>Recovery test</p>';
        const recovery = await window.convertToMarkdown(simpleHTML);
        
        return {
          success: true,
          firstConversion: markdown.markdown,
          recoveryConversion: recovery.markdown,
          workerPoolStillFunctional: recovery.markdown.includes('Recovery test')
        };
      } catch (error) {
        return {
          success: false,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Should handle the conversion (script content should be sanitized)
    if (result.success) {
      expect(result.workerPoolStillFunctional).toBe(true);
      expect(result.recoveryConversion).toContain('Recovery test');
      // Script content should not appear in markdown
      expect(result.firstConversion?.toLowerCase()).not.toContain('throw new error');
    } else {
      // If it fails, should recover for next conversion
      const recoveryTest = await page.evaluate(async () => {
        try {
          const markdown = await window.convertToMarkdown('<p>Recovery after error</p>');
          return { recovered: true, content: markdown.markdown };
        } catch (error) {
          return { recovered: false, error: error instanceof Error ? error.message : String(error) };
        }
      });
      
      expect(recoveryTest.recovered).toBe(true);
    }
  });

  test('should timeout on extremely complex processing', async ({ page }) => {
    // This test might not always trigger timeout depending on system performance
    // but it should at least not hang indefinitely
    
    const result = await page.evaluate(async () => {
      const startTime = performance.now();
      
      try {
        // Create extremely nested HTML that could cause performance issues
        const depth = 1000;
        let html = '';
        for (let i = 0; i < depth; i++) {
          html += `<div class="level-${i}">`;
        }
        html += '<p>Deep content</p>';
        for (let i = 0; i < depth; i++) {
          html += '</div>';
        }
        
        // Set a shorter timeout for this test
        const options = { conversionTimeout: 5000 }; // 5 seconds
        
        const markdown = await window.convertToMarkdown(html, options);
        
        const endTime = performance.now();
        
        return {
          success: true,
          content: markdown.markdown,
          duration: endTime - startTime,
          completedInReasonableTime: (endTime - startTime) < 10000 // 10 seconds
        };
      } catch (error) {
        const endTime = performance.now();
        
        return {
          success: false,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          duration: endTime - startTime,
          isTimeoutError: error instanceof Error && error.name === 'ConversionTimeoutError'
        };
      }
    });

    // Should either complete in reasonable time or timeout appropriately
    if (result.success) {
      expect(result.completedInReasonableTime).toBe(true);
      expect(result.content).toContain('Deep content');
    } else {
      // If it fails, should be a timeout or other handled error
      expect(typeof result.errorName).toBe('string');
      expect(typeof result.errorMessage).toBe('string');
      // Timeout should occur within reasonable bounds
      expect(result.duration).toBeLessThan(15000); // 15 seconds max
    }
  });

  test('should handle empty and null inputs', async ({ page }) => {
    const testCases = ['', '   ', '\n\n\n', '<>', '<!-- comment only -->'];

    for (const testHTML of testCases) {
      const result = await page.evaluate(async (html) => {
        try {
          const markdown = await window.convertToMarkdown(html);
          return {
            success: true,
            content: markdown.markdown,
            isEmpty: !markdown.markdown.trim()
          };
        } catch (error) {
          return {
            success: false,
            errorName: error instanceof Error ? error.name : 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error)
          };
        }
      }, testHTML);

      // Should handle empty/minimal content gracefully
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(typeof result.content).toBe('string');
        // Empty or whitespace-only input should produce empty or minimal output
        if (testHTML.trim() === '' || testHTML.trim() === '<>') {
          expect(result.isEmpty).toBe(true);
        }
      }
    }
  });
});