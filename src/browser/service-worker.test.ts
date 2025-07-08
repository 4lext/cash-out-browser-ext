/**
 * Tests for Service Worker implementation
 */

import { describe, it, expect } from 'bun:test';
import { convertToMarkdown, cleanup } from './service-worker.js';

// Setup DOM globals
import '@/test/dom-setup.ts';


describe('Service Worker API', () => {
  describe('convertToMarkdown', () => {
    it('converts simple HTML to markdown', async () => {
      const html = '<h1>Hello World</h1><p>This is a <strong>test</strong>.</p>';
      const result = await convertToMarkdown(html);
      
      expect(result.markdown).toContain('# Hello World');
      expect(result.markdown).toContain('This is a **test**.');
    });

    it('includes metadata when requested', async () => {
      const html = '<title>Test Page</title><p>Content here</p>';
      const result = await convertToMarkdown(html, { includeMetadata: true });
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBe('Test Page');
      expect(result.metadata?.wordCount).toBeGreaterThan(0);
    });

    it('respects maxInputSize option', async () => {
      const html = '<p>Small content</p>';
      
      expect(async () => {
        await convertToMarkdown(html, { maxInputSize: 5 }); // Very small limit
      }).toThrow('Input size');
    });

    it('applies LLM optimizations correctly', async () => {
      const html = `
        <h1><strong>Bold Heading</strong></h1>
        <p>First paragraph.</p>
        <p>Second paragraph.</p>
      `;
      
      const result = await convertToMarkdown(html, { 
        optimizationLevel: 'standard'
      });
      
      expect(result.markdown).toContain('# Bold Heading'); // Bold removed from heading
      expect(result.markdown).toContain('First paragraph.');
      expect(result.markdown).toContain('Second paragraph.');
    });
  });

  describe('Error handling', () => {
    it('handles malformed HTML gracefully', async () => {
      const result = await convertToMarkdown('<invalid>unclosed tag');
      expect(typeof result.markdown).toBe('string');
      expect(result.markdown).toContain('unclosed tag');
    });

    it('handles empty input gracefully', async () => {
      const result = await convertToMarkdown('');
      expect(result.markdown).toBe('');
    });
  });

  describe('Performance', () => {
    it('processes documents efficiently without workers', async () => {
      // Generate a medium-sized HTML document
      const sections = Array.from({ length: 50 }, (_, i) => 
        `<section><h2>Section ${i + 1}</h2><p>Content for section ${i + 1}</p></section>`
      ).join('');
      const html = `<html><body>${sections}</body></html>`;
      
      const startTime = performance.now();
      const result = await convertToMarkdown(html);
      const endTime = performance.now();
      
      expect(result.markdown).toContain('# Section 1');
      expect(result.markdown).toContain('Section 50');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('cleanup', () => {
    it('cleanup function exists and does not throw', () => {
      expect(() => cleanup()).not.toThrow();
    });
  });
});