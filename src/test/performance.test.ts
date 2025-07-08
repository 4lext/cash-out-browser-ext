/**
 * Performance benchmarks for HTML to Markdown converter
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { HTMLToMarkdownConverter } from '@/core/converter/converter.js';
import { SafeDOMParser } from '@/core/parser/dom-parser.js';

// Setup DOM globals
import '@/test/dom-setup.ts';

// Generate test HTML of various sizes
function generateHTML(sizeInBytes: number): string {
  const overhead = 100; // Approximate overhead for HTML structure
  const contentSize = Math.max(0, sizeInBytes - overhead);
  const paragraphSize = 100; // Approximate size of each paragraph
  const numParagraphs = Math.floor(contentSize / paragraphSize);
  
  let html = '<html><head><title>Test Document</title></head><body>';
  
  for (let i = 0; i < numParagraphs; i++) {
    if (i % 10 === 0) {
      html += `<h2>Section ${Math.floor(i / 10) + 1}</h2>`;
    }
    html += `<p>This is paragraph ${i + 1} with some <strong>bold</strong> and <em>italic</em> text.</p>`;
  }
  
  html += '</body></html>';
  return html;
}

// Generate complex HTML with various elements
function generateComplexHTML(): string {
  return `
    <html>
      <head>
        <title>Complex Document</title>
      </head>
      <body>
        <nav>
          <ul>
            <li><a href="#section1">Section 1</a></li>
            <li><a href="#section2">Section 2</a></li>
            <li><a href="#section3">Section 3</a></li>
          </ul>
        </nav>
        
        <main>
          <article>
            <h1>Main Article Title</h1>
            
            <section id="section1">
              <h2>Introduction</h2>
              <p>This is the introduction with <strong>bold text</strong>, <em>italic text</em>, and <code>inline code</code>.</p>
              
              <blockquote>
                <p>This is a blockquote with multiple paragraphs.</p>
                <p>It demonstrates how quotes are handled.</p>
              </blockquote>
            </section>
            
            <section id="section2">
              <h2>Code Examples</h2>
              <pre><code class="language-javascript">
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Example usage
for (let i = 0; i < 10; i++) {
  console.log(fibonacci(i));
}
              </code></pre>
              
              <h3>Lists</h3>
              <ul>
                <li>First item</li>
                <li>Second item with <a href="https://example.com">a link</a></li>
                <li>Third item
                  <ul>
                    <li>Nested item 1</li>
                    <li>Nested item 2</li>
                  </ul>
                </li>
              </ul>
              
              <ol>
                <li>Ordered item 1</li>
                <li>Ordered item 2</li>
                <li>Ordered item 3</li>
              </ol>
            </section>
            
            <section id="section3">
              <h2>Tables</h2>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>City</th>
                    <th>Country</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Alice</td>
                    <td>30</td>
                    <td>New York</td>
                    <td>USA</td>
                  </tr>
                  <tr>
                    <td>Bob</td>
                    <td>25</td>
                    <td>London</td>
                    <td>UK</td>
                  </tr>
                  <tr>
                    <td>Charlie</td>
                    <td>35</td>
                    <td>Tokyo</td>
                    <td>Japan</td>
                  </tr>
                </tbody>
              </table>
              
              <h3>Images</h3>
              <figure>
                <img src="https://example.com/image1.jpg" alt="Example image 1">
                <figcaption>This is an image caption</figcaption>
              </figure>
            </section>
          </article>
        </main>
        
        <aside>
          <h3>Related Links</h3>
          <ul>
            <li><a href="https://example.com/related1">Related Article 1</a></li>
            <li><a href="https://example.com/related2">Related Article 2</a></li>
          </ul>
        </aside>
        
        <footer>
          <p>&copy; 2024 Example Corp. All rights reserved.</p>
        </footer>
      </body>
    </html>
  `;
}

describe('Performance Benchmarks', () => {
  let parser: SafeDOMParser;

  beforeAll(() => {
    parser = new SafeDOMParser();
  });

  it('converts small document (10KB) quickly', () => {
    const html = generateHTML(10 * 1024);
    const converter = new HTMLToMarkdownConverter();
    const doc = parser.parse(html);
    const result = converter.convert(doc);
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  it('converts medium document (100KB) quickly', () => {
    const html = generateHTML(100 * 1024);
    const converter = new HTMLToMarkdownConverter();
    const doc = parser.parse(html);
    const result = converter.convert(doc);
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  it('converts large document (1MB) quickly', () => {
    const html = generateHTML(1024 * 1024);
    const converter = new HTMLToMarkdownConverter();
    const doc = parser.parse(html);
    const result = converter.convert(doc);
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  it('converts complex document with various elements', () => {
    const html = generateComplexHTML();
    const converter = new HTMLToMarkdownConverter();
    const doc = parser.parse(html);
    const result = converter.convert(doc);
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  it('converts document with deep nesting', () => {
    let html = '<div>';
    for (let i = 0; i < 50; i++) {
      html += '<div>';
    }
    html += '<p>Deep content</p>';
    for (let i = 0; i < 50; i++) {
      html += '</div>';
    }
    html += '</div>';
    
    const converter = new HTMLToMarkdownConverter();
    const doc = parser.parse(html);
    const result = converter.convert(doc);
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  it('converts document with many links', () => {
    let html = '<body>';
    for (let i = 0; i < 100; i++) {
      html += `<p>This is <a href="https://example.com/page${i}">link ${i}</a> in the document.</p>`;
    }
    html += '</body>';
    
    const converter = new HTMLToMarkdownConverter();
    const doc = parser.parse(html);
    const result = converter.convert(doc);
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  it('converts document with many code blocks', () => {
    let html = '<body>';
    for (let i = 0; i < 50; i++) {
      html += `<pre><code class="language-javascript">
function example${i}() {
  console.log("This is example ${i}");
  return ${i} * 2;
}
</code></pre>`;
    }
    html += '</body>';
    
    const converter = new HTMLToMarkdownConverter();
    const doc = parser.parse(html);
    const result = converter.convert(doc);
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  it('performs conversion with metadata extraction', () => {
    const html = generateComplexHTML();
    const converter = new HTMLToMarkdownConverter({ includeMetadata: true });
    const doc = parser.parse(html);
    converter.convert(doc);
  });

  it('performs conversion with optimizations', () => {
    const html = generateComplexHTML();
    const converter = new HTMLToMarkdownConverter({ optimizationLevel: 'aggressive' });
    const doc = parser.parse(html);
    converter.convert(doc);
  });
});