import { test, expect } from '@playwright/test';

// Define types for global window methods
interface ConversionOptions {
  conversionTimeout?: number;
  maxInputSize?: number;
}

declare global {
  interface Window {
    convertToMarkdown: (html: string, options?: ConversionOptions) => Promise<{ markdown: string; metadata?: unknown }>;
    cleanup: () => void;
    complexHTMLContent?: string;
  }
}

test.describe('Cash Out Browser API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the page and display title correctly', async ({ page }) => {
    await expect(page).toHaveTitle('Cash Out - Browser Test');
    await expect(page.locator('h1')).toHaveText('Cash Out - Browser Test Suite');
  });

  test('should perform basic HTML to Markdown conversion', async ({ page }) => {
    // Click the basic test button
    await page.click('#test-basic');
    
    // Wait for the result to appear
    await page.waitForSelector('#basic-result.success', { timeout: 10000 });
    
    const result = await page.textContent('#basic-result');
    expect(result).toContain('✅ Success!');
    expect(result).toContain('# Main Title');
    expect(result).toContain('**bold**');
    expect(result).toContain('_italic_');
    expect(result).toContain('- First item');
    expect(result).toContain('[a link](https://example.com)');
    expect(result).toContain('`inline code`');
  });

  test('should convert simple tables to markdown format', async ({ page }) => {
    await page.click('#test-table');
    
    await page.waitForSelector('#table-result.success', { timeout: 10000 });
    
    const result = await page.textContent('#table-result');
    expect(result).toContain('✅ Success!');
    expect(result).toContain('| Name | Age | City |');
    expect(result).toContain('| --- | --- | --- |');
    expect(result).toContain('| John | 30 | New York |');
    expect(result).toContain('| Jane | 25 | Los Angeles |');
  });

  test('should enforce size limits correctly', async ({ page }) => {
    await page.click('#test-size');
    
    await page.waitForSelector('#size-result.success, #size-result.error', { timeout: 10000 });
    
    const result = await page.textContent('#size-result');
    expect(result).toContain('✅ Success!');
    expect(result).toContain('Size limit correctly enforced');
  });

  test('should handle concurrent conversions', async ({ page }) => {
    await page.click('#test-concurrent');
    
    await page.waitForSelector('#concurrent-result.success', { timeout: 15000 });
    
    const result = await page.textContent('#concurrent-result');
    expect(result).toContain('✅ Success!');
    expect(result).toContain('All 5 conversions completed');
    expect(result).toContain('# Test 1');
    expect(result).toContain('## Test 2');
    expect(result).toContain('### Test 3');
  });

  test('should verify worker communication', async ({ page }) => {
    await page.click('#test-worker');
    
    await page.waitForSelector('#worker-result.success', { timeout: 10000 });
    
    const result = await page.textContent('#worker-result');
    expect(result).toContain('✅ Success!');
    expect(result).toContain('Worker communication working properly');
  });

  test('should handle invalid HTML gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const invalidHTML = '<div><p>Unclosed tags<span>nested';
        const markdown = await window.convertToMarkdown(invalidHTML);
        return { success: true, markdown: markdown.markdown };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Should either succeed (with sanitized HTML) or fail gracefully
    expect(typeof result.success).toBe('boolean');
    if (result.success) {
      expect(typeof result.markdown).toBe('string');
    } else {
      expect(typeof result.error).toBe('string');
    }
  });

  test('should convert complex content correctly', async ({ page }) => {
    await page.goto('/complex-content.html');
    
    const result = await page.evaluate(async () => {
      const markdown = await window.convertToMarkdown(window.complexHTMLContent || '');
      return markdown.markdown;
    });

    expect(result).toContain('# Complex HTML Content for Testing');
    expect(result).toContain('## Nested Lists');
    expect(result).toContain('## Complex Table');
    expect(result).toContain('- 001 | John Doe'); // Complex table should be converted to list
    expect(result).toContain('## Code Blocks');
    expect(result).toContain('```');
    expect(result).toContain('function example()');
    expect(result).toContain('`inline code`');
    expect(result).toContain('[the project repository](https://github.com/stevekinney/cash-out)');
  });

  test('should cleanup resources properly', async ({ page }) => {
    // Test that cleanup function is available and can be called
    const result = await page.evaluate(async () => {
      try {
        window.cleanup();
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    expect(result.success).toBe(true);
  });
});