/**
 * Tests for HTML to Markdown converter
 */

import { beforeAll, describe, expect, it } from 'bun:test';

import { SafeDOMParser } from '../parser/dom-parser.js';
import { HTMLToMarkdownConverter } from './converter.js';

// Setup DOM globals
import '@/test/dom-setup.ts';

describe('HTMLToMarkdownConverter', () => {
  let parser: SafeDOMParser;
  let converter: HTMLToMarkdownConverter;

  beforeAll(() => {
    parser = new SafeDOMParser();
  });

  describe('Basic conversions', () => {
    it('converts headings correctly', () => {
      const html = `
        <h1>Main Title</h1>
        <h2>Subtitle</h2>
        <h3>Section</h3>
        <h4>Subsection</h4>
        <h5>Detail</h5>
        <h6>Fine Print</h6>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toContain('# Main Title');
      expect(result.markdown).toContain('## Subtitle');
      expect(result.markdown).toContain('### Section');
      expect(result.markdown).toContain('#### Subsection');
      expect(result.markdown).toContain('##### Detail');
      expect(result.markdown).toContain('###### Fine Print');
    });

    it('converts paragraphs with proper spacing', () => {
      const html = `
        <p>First paragraph with some text.</p>
        <p>Second paragraph with more text.</p>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toBe(
        'First paragraph with some text.\n\nSecond paragraph with more text.',
      );
    });

    it('converts inline formatting', () => {
      const html = `
        <p>Text with <strong>bold</strong>, <em>italic</em>, and <code>code</code>.</p>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toBe('Text with **bold**, _italic_, and `code`.');
    });

    it('converts links correctly', () => {
      const html = `
        <p>Visit <a href="https://example.com">our website</a> for more info.</p>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toBe(
        'Visit [our website](https://example.com) for more info.',
      );
    });

    it('converts images', () => {
      const html = `
        <img src="https://example.com/image.jpg" alt="Example image" />
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toBe('![Example image](https://example.com/image.jpg)');
    });

    it('converts unordered lists', () => {
      const html = `
        <ul>
          <li>First item</li>
          <li>Second item</li>
          <li>Third item</li>
        </ul>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toBe('- First item\n- Second item\n- Third item');
    });

    it('converts ordered lists', () => {
      const html = `
        <ol>
          <li>First step</li>
          <li>Second step</li>
          <li>Third step</li>
        </ol>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toBe('1. First step\n2. Second step\n3. Third step');
    });

    it('converts code blocks', () => {
      const html = `
        <pre><code class="language-javascript">function hello() {
  console.log("Hello, world!");
}</code></pre>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toContain(
        '```javascript\nfunction hello() {\n  console.log("Hello, world!");\n}\n```',
      );
    });

    it('converts blockquotes', () => {
      const html = `
        <blockquote>
          <p>This is a quote.</p>
          <p>It has multiple paragraphs.</p>
        </blockquote>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toBe('> This is a quote.\n> It has multiple paragraphs.');
    });

    it('converts simple tables', () => {
      const html = `
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Alice</td>
              <td>30</td>
            </tr>
            <tr>
              <td>Bob</td>
              <td>25</td>
            </tr>
          </tbody>
        </table>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toContain('| Name | Age |');
      expect(result.markdown).toContain('| --- | --- |');
      expect(result.markdown).toContain('| Alice | 30 |');
      expect(result.markdown).toContain('| Bob | 25 |');
    });
  });

  describe('Complex content', () => {
    it('converts nested lists', () => {
      const html = `
        <ul>
          <li>Parent item
            <ul>
              <li>Nested item 1</li>
              <li>Nested item 2</li>
            </ul>
          </li>
          <li>Another parent</li>
        </ul>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toContain('- Parent item');
      expect(result.markdown).toContain('  - Nested item 1');
      expect(result.markdown).toContain('  - Nested item 2');
      expect(result.markdown).toContain('- Another parent');
    });

    it('handles malformed HTML gracefully', () => {
      const html = `
        <p>Unclosed paragraph
        <b>Bold text
        <p>New paragraph</p>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      // Should still produce valid markdown
      expect(result.markdown).toContain('Unclosed paragraph');
      expect(result.markdown).toContain('Bold text');
      expect(result.markdown).toContain('New paragraph');
    });

    it('skips script and style elements', () => {
      const html = `
        <p>Visible content</p>
        <script>console.log('This should not appear');</script>
        <style>body { color: red; }</style>
        <p>More visible content</p>
      `;

      converter = new HTMLToMarkdownConverter();
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).not.toContain('console.log');
      expect(result.markdown).not.toContain('color: red');
      expect(result.markdown).toContain('Visible content');
      expect(result.markdown).toContain('More visible content');
    });
  });

  describe('Metadata', () => {
    it('includes metadata when requested', () => {
      const html = '<p>Test content with a few words.</p>';

      converter = new HTMLToMarkdownConverter({ includeMetadata: true });
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.wordCount).toBeGreaterThan(0);
      expect(result.metadata?.conversionTimeMs).toBeGreaterThan(0);
      expect(result.metadata?.originalSize).toBeGreaterThan(0);
      expect(result.metadata?.outputSize).toBeGreaterThan(0);
    });

    it('extracts title from document', () => {
      const html = `
        <html>
          <head><title>Test Document</title></head>
          <body><p>Content</p></body>
        </html>
      `;

      converter = new HTMLToMarkdownConverter({ includeMetadata: true });
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.metadata?.title).toBe('Test Document');
    });
  });

  describe('Main content extraction', () => {
    it('extracts content from article element', () => {
      const html = `
        <body>
          <nav>Navigation</nav>
          <article>
            <h1>Main Article</h1>
            <p>Article content</p>
          </article>
          <aside>Sidebar</aside>
        </body>
      `;

      converter = new HTMLToMarkdownConverter({ optimizationLevel: 'aggressive' });
      const doc = parser.parse(html);
      const result = converter.convert(doc);

      expect(result.markdown).toContain('Main Article');
      expect(result.markdown).toContain('Article content');
      expect(result.markdown).toContain('Navigation');
      expect(result.markdown).toContain('Sidebar');
    });
  });
});
