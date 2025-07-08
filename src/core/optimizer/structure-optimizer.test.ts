/**
 * Tests for structure optimizer
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { StructureOptimizer } from './structure-optimizer.js';

// Setup DOM globals
import '@/test/dom-setup.ts';

describe('StructureOptimizer', () => {
  let optimizer: StructureOptimizer;

  beforeEach(() => {
    optimizer = new StructureOptimizer();
  });

  describe('Heading normalization', () => {
    it('fixes heading hierarchy jumps', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <h3>Skipped to h3</h3>
          <h5>Skipped to h5</h5>
          <h2>Back to h2</h2>
        </div>
      `;
      
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const div = doc.querySelector('div')!;
      
      optimizer.optimizeStructure(div as any);
      
      const headings = Array.from(div.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      expect(headings[0]?.tagName).toBe('H1');
      expect(headings[1]?.tagName).toBe('H2'); // Fixed from H3
      expect(headings[2]?.tagName).toBe('H3'); // Fixed from H5
      expect(headings[3]?.tagName).toBe('H2'); // Unchanged
    });

    it('maintains content when fixing headings', () => {
      const html = `
        <div>
          <h1>Main Title</h1>
          <h3>Section Title</h3>
        </div>
      `;
      
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const div = doc.querySelector('div')!;
      
      optimizer.optimizeStructure(div as any);
      
      const h2 = div.querySelector('h2');
      expect(h2?.textContent).toBe('Section Title');
    });
  });

  describe('Redundant formatting removal', () => {
    it('removes bold from headings', () => {
      const html = `
        <div>
          <h1><strong>Bold Heading</strong></h1>
          <h2><b>Another Bold</b> Heading</h2>
          <h3>Regular <em>with italic</em></h3>
        </div>
      `;
      
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const div = doc.querySelector('div')!;
      
      optimizer.optimizeStructure(div as any);
      
      expect(div.querySelector('h1')?.innerHTML).toBe('Bold Heading');
      expect(div.querySelector('h2')?.innerHTML).toBe('Another Bold Heading');
      expect(div.querySelector('h3')?.innerHTML).toBe('Regular <em>with italic</em>');
    });

    it('removes nested formatting of same type', () => {
      const html = `
        <p>Text with <strong><strong>double bold</strong></strong> and <em><i>double italic</i></em></p>
      `;
      
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const p = doc.querySelector('p')!;
      
      optimizer.optimizeStructure(p as any);
      
      expect(p.textContent).toBe('Text with double bold and double italic');
      expect(p.querySelectorAll('strong').length).toBe(1);
      expect(p.querySelectorAll('em').length).toBe(1);
      // Check that there are no nested strong/em elements
      expect(p.querySelectorAll('strong strong').length).toBe(0);
      expect(p.querySelectorAll('em em').length).toBe(0);
      expect(p.querySelectorAll('em i').length).toBe(0);
    });
  });

  describe('Deep nesting flattening', () => {
    it('flattens deeply nested lists', () => {
      const html = `
        <ul>
          <li>Level 1
            <ul>
              <li>Level 2
                <ul>
                  <li>Level 3
                    <ul>
                      <li>Level 4 - too deep</li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `;
      
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const ul = doc.querySelector('ul')!;
      
      optimizer.optimizeStructure(ul as any);
      
      // Check that deep nesting is flattened
      const allLists = ul.querySelectorAll('ul');
      let maxDepth = 1;
      for (const list of allLists) {
        let depth = 1;
        let parent = list.parentElement;
        while (parent) {
          if (parent.tagName === 'UL' || parent.tagName === 'OL') {
            depth++;
          }
          parent = parent.parentElement;
        }
        maxDepth = Math.max(maxDepth, depth);
      }
      
      expect(maxDepth).toBeLessThanOrEqual(3);
    });

    it('flattens deeply nested divs', () => {
      const html = `
        <div>
          <div>
            <div>
              <div>
                <div>
                  <p>Deeply nested content</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const root = doc.querySelector('div')!;
      
      optimizer.optimizeStructure(root as any);
      
      // Count remaining div depth
      const p = root.querySelector('p')!;
      let depth = 0;
      let parent = p.parentElement;
      while (parent && parent !== root) {
        if (parent.tagName === 'DIV') {
          depth++;
        }
        parent = parent.parentElement;
      }
      
      expect(depth).toBeLessThanOrEqual(3);
    });
  });

  describe('Adjacent element merging', () => {
    it('merges adjacent text nodes', () => {
      const html = `<p>First text</p>`;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const p = doc.querySelector('p')!;
      
      // Manually create adjacent text nodes
      p.appendChild(document.createTextNode(' second'));
      p.appendChild(document.createTextNode(' text'));
      
      expect(p.childNodes.length).toBe(3);
      
      optimizer.optimizeStructure(p as any);
      
      expect(p.childNodes.length).toBe(1);
      expect(p.textContent).toBe('First text second text');
    });

    it('merges incomplete paragraphs', () => {
      const html = `
        <div>
          <p>This sentence is incomplete</p>
          <p>and continues here.</p>
          <p>But this is a new sentence.</p>
        </div>
      `;
      
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const div = doc.querySelector('div')!;
      
      optimizer.optimizeStructure(div as any);
      
      const paragraphs = div.querySelectorAll('p');
      expect(paragraphs.length).toBe(2);
      expect(paragraphs[0]?.textContent).toBe('This sentence is incomplete and continues here.');
      expect(paragraphs[1]?.textContent).toBe('But this is a new sentence.');
    });
  });

  describe('Custom options', () => {
    it('respects disabled optimizations', () => {
      const customOptimizer = new StructureOptimizer({
        normalizeHeadings: false,
        removeRedundantFormatting: false,
      });
      
      const html = `
        <div>
          <h1><strong>Bold H1</strong></h1>
          <h3>Jumped to H3</h3>
        </div>
      `;
      
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const div = doc.querySelector('div')!;
      
      customOptimizer.optimizeStructure(div as any);
      
      // Should not change anything
      expect(div.querySelector('h1 strong')).toBeDefined();
      expect(div.querySelector('h3')).toBeDefined();
      expect(div.querySelector('h2')).toBeNull();
    });

    it('adjusts max nesting depth', () => {
      const aggressiveOptimizer = new StructureOptimizer({
        maxNestingDepth: 2,
      });
      
      const html = `
        <ul>
          <li>Level 1
            <ul>
              <li>Level 2
                <ul>
                  <li>Level 3 - should be flattened</li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `;
      
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const ul = doc.querySelector('ul')!;
      
      aggressiveOptimizer.optimizeStructure(ul as any);
      
      // Should have flattened level 3
      const level3List = ul.querySelector('ul ul ul');
      expect(level3List).toBeNull();
    });
  });
});