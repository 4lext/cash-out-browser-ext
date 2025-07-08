/**
 * Tests for HTML to Markdown converter with Element/Fragment input
 */

import { describe, it, expect } from 'bun:test';
import { HTMLToMarkdownConverter } from './converter.js';
import { SafeDOMParser } from '@/core/parser/dom-parser.js';

// Setup DOM globals
import '@/test/dom-setup.ts';

describe('HTMLToMarkdownConverter - Element/Fragment Support', () => {
  const parser = new SafeDOMParser();

  describe('String input (fragments)', () => {
    it('should convert HTML fragment strings directly', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert(html);
      
      expect(result.markdown).toBe('Hello **world**!');
    });

    it('should convert multiple elements in a fragment', () => {
      const html = `
        <h1>Title</h1>
        <p>First paragraph</p>
        <p>Second paragraph</p>
      `;
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert(html);
      
      expect(result.markdown).toContain('# Title');
      expect(result.markdown).toContain('First paragraph');
      expect(result.markdown).toContain('Second paragraph');
    });

    it('should handle inline elements in fragments', () => {
      const html = 'This is <em>italic</em> and <strong>bold</strong> text.';
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert(html);
      
      expect(result.markdown.trim()).toBe('This is _italic_ and **bold** text.');
    });
  });

  describe('Element input', () => {
    it('should convert a single element', () => {
      const doc = parser.parse('<html><body><div id="test"><h2>Test Header</h2><p>Test content</p></div></body></html>');
      const element = doc.getElementById?.('test') || doc.querySelector('#test')!;
      
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert(element);
      
      expect(result.markdown).toContain('## Test Header');
      expect(result.markdown).toContain('Test content');
    });

    it('should convert a paragraph element', () => {
      const doc = parser.parse('<html><body><p>Simple <a href="http://example.com">link</a> test</p></body></html>');
      const paragraph = doc.querySelector('p')!;
      
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert(paragraph);
      
      expect(result.markdown).toBe('Simple [link](http://example.com) test');
    });

    it('should convert a list element', () => {
      const doc = parser.parse(`
        <html><body>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        </body></html>
      `);
      const list = doc.querySelector('ul')!;
      
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert(list);
      
      expect(result.markdown).toBe('- Item 1\n- Item 2\n- Item 3');
    });

    it('should convert a table element', () => {
      const doc = parser.parse(`
        <html><body>
          <table>
            <thead>
              <tr><th>Name</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>A</td><td>1</td></tr>
              <tr><td>B</td><td>2</td></tr>
            </tbody>
          </table>
        </body></html>
      `);
      const table = doc.querySelector('table')!;
      
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert(table);
      
      expect(result.markdown).toContain('| Name | Value |');
      expect(result.markdown).toContain('| A | 1 |');
      expect(result.markdown).toContain('| B | 2 |');
    });
  });

  describe('Document input', () => {
    it('should still work with full documents', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Test Document</title></head>
          <body>
            <h1>Document Title</h1>
            <p>Document content</p>
          </body>
        </html>
      `;
      const doc = parser.parse(html);
      
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert(doc);
      
      expect(result.markdown).toContain('# Document Title');
      expect(result.markdown).toContain('Document content');
    });
  });

  describe('Metadata handling', () => {
    it('should not include document metadata for element input', () => {
      const doc = parser.parse(`
        <html>
          <head>
            <title>Page Title</title>
            <meta name="description" content="Page description">
          </head>
          <body>
            <div id="content">
              <h1>Content Title</h1>
            </div>
          </body>
        </html>
      `);
      const element = doc.getElementById?.('content') || doc.querySelector('#content')!;
      
      const converter2 = new HTMLToMarkdownConverter({ includeMetadata: true });
      const result = converter2.convert(element);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBeUndefined(); // No document metadata for elements
      expect(result.metadata?.description).toBeUndefined();
      expect(result.markdown).toContain('# Content Title');
    });

    it('should include metadata for document input', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Page Title</title>
            <meta name="description" content="Page description">
          </head>
          <body>
            <h1>Content</h1>
          </body>
        </html>
      `;
      const doc = parser.parse(html);
      
      const converter2 = new HTMLToMarkdownConverter({ includeMetadata: true });
      const result = converter2.convert(doc);
      
      expect(result.metadata?.title).toBe('Page Title');
      expect(result.metadata?.description).toBe('Page description');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty elements', () => {
      const doc = parser.parse('<html><body><div></div></body></html>');
      const div = doc.querySelector('div')!;
      
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert(div);
      
      expect(result.markdown).toBe('');
    });

    it('should handle text-only input', () => {
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert('Just plain text');
      
      expect(result.markdown).toBe('Just plain text');
    });

    it('should handle complex nested structures in fragments', () => {
      const html = `
        <article>
          <header>
            <h1>Article Title</h1>
            <p>By <em>Author Name</em></p>
          </header>
          <section>
            <h2>Section 1</h2>
            <p>Content with <strong>formatting</strong> and <a href="/link">links</a>.</p>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
          </section>
        </article>
      `;
      
      const converter = new HTMLToMarkdownConverter();
      const result = converter.convert(html);
      
      expect(result.markdown).toContain('# Article Title');
      expect(result.markdown).toContain('By _Author Name_');
      expect(result.markdown).toContain('## Section 1');
      expect(result.markdown).toContain('**formatting**');
      expect(result.markdown).toContain('[links](/link)');
      expect(result.markdown).toContain('- List item 1');
    });
  });
});