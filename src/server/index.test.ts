/**
 * Tests for server API
 */

import { describe, it, expect } from 'bun:test';
import { convertToMarkdown, htmlToMarkdown, convertBatch } from './index.js';

// Setup DOM globals
import '@/test/dom-setup.ts';

describe('Server API', () => {
  describe('convertToMarkdown', () => {
    it('converts simple HTML to markdown', () => {
      const html = '<h1>Hello World</h1><p>This is a <strong>test</strong>.</p>';
      const result = convertToMarkdown(html);
      
      expect(result.markdown).toContain('# Hello World');
      expect(result.markdown).toContain('This is a **test**.');
    });

    it('includes metadata when requested', () => {
      const html = '<title>Test Page</title><p>Content here</p>';
      const result = convertToMarkdown(html, { includeMetadata: true });
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBe('Test Page');
      expect(result.metadata?.wordCount).toBeGreaterThan(0);
    });

    it('respects maxInputSize option', () => {
      const html = '<p>Small content</p>';
      
      expect(() => {
        convertToMarkdown(html, { maxInputSize: 5 }); // Very small limit
      }).toThrow('Input size');
    });

    it('converts with different optimization levels', () => {
      const html = `
        <nav>Navigation</nav>
        <article>
          <h1>Main Article</h1>
          <p>Main content here</p>
        </article>
        <aside>Sidebar</aside>
      `;
      
      const result = convertToMarkdown(html, { optimizationLevel: 'aggressive' });
      expect(result.markdown).toContain('Main Article');
      expect(result.markdown).toContain('Navigation');
      expect(result.markdown).toContain('Sidebar');
    });

    it('applies LLM optimizations correctly', () => {
      const html = `
        <h1><strong>Bold Heading</strong></h1>
        <p>First paragraph.</p>
        <p>Second paragraph.</p>
      `;
      
      const result = convertToMarkdown(html, { 
        optimizationLevel: 'standard'
      });
      
      expect(result.markdown).toContain('# Bold Heading'); // Bold removed from heading
      expect(result.markdown).toContain('First paragraph.');
      expect(result.markdown).toContain('Second paragraph.');
    });
  });

  describe('htmlToMarkdown', () => {
    it('returns markdown string directly', () => {
      const html = '<h2>Simple Test</h2>';
      const markdown = htmlToMarkdown(html);
      
      expect(typeof markdown).toBe('string');
      expect(markdown).toContain('## Simple Test');
    });
  });

  describe('convertBatch', () => {
    it('converts array of HTML strings', () => {
      const htmlDocs = [
        '<h1>Doc 1</h1>',
        '<h2>Doc 2</h2>',
        '<h3>Doc 3</h3>'
      ];
      
      const results = convertBatch(htmlDocs);
      
      expect(results).toHaveLength(3);
      expect(results[0]?.markdown).toContain('# Doc 1');
      expect(results[1]?.markdown).toContain('## Doc 2');
      expect(results[2]?.markdown).toContain('### Doc 3');
    });

    it('converts array of objects with options', () => {
      const docs = [
        { html: '<title>Page 1</title><p>Content 1</p>', options: { includeMetadata: true } },
        { html: '<p>Content 2</p>', options: { includeMetadata: false } }
      ];
      
      const results = convertBatch(docs);
      
      expect(results).toHaveLength(2);
      expect(results[0]?.metadata).toBeDefined();
      expect(results[1]?.metadata).toBeUndefined();
    });

    it('handles mixed array of strings and objects', () => {
      const docs = [
        '<h1>String Doc</h1>',
        { html: '<h2>Object Doc</h2>', options: { includeMetadata: true } }
      ];
      
      const results = convertBatch(docs);
      
      expect(results).toHaveLength(2);
      expect(results[0]?.markdown).toContain('# String Doc');
      expect(results[1]?.markdown).toContain('## Object Doc');
      expect(results[1]?.metadata).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('handles malformed HTML gracefully', () => {
      // DOMParser is quite forgiving, so test with truly problematic input
      const result = convertToMarkdown('<invalid>unclosed tag');
      expect(typeof result.markdown).toBe('string');
      expect(result.markdown).toContain('unclosed tag');
    });

    it('handles empty input gracefully', () => {
      const result = convertToMarkdown('');
      expect(result.markdown).toBe('');
    });

    it('handles whitespace-only input', () => {
      const result = convertToMarkdown('   \n\t   ');
      expect(result.markdown.trim()).toBe('');
    });
  });

  describe('Performance', () => {
    it('processes large documents efficiently', () => {
      // Generate a large HTML document
      const sections = Array.from({ length: 100 }, (_, i) => 
        `<section><h2>Section ${i + 1}</h2><p>Content for section ${i + 1}</p></section>`
      ).join('');
      const html = `<html><body>${sections}</body></html>`;
      
      const startTime = performance.now();
      const result = convertToMarkdown(html);
      const endTime = performance.now();
      
      expect(result.markdown).toContain('# Section 1');
      expect(result.markdown).toContain('Section 100');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});