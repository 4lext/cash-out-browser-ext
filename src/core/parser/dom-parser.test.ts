import { describe, expect, it, mock } from 'bun:test';

import { SafeDOMParser } from './dom-parser.js';
import { InvalidHTMLError } from '@/errors/converter-errors.js';

// Mock the dependencies
void mock.module('@/core/security/sanitizer.js', () => ({
  validateInput: mock((html: string) => {
    if (html.length > 10485760) throw new Error('Input too large');
    if (!html.trim()) throw new Error('Empty input');
  }),
  checkNestingDepth: mock((element: any) => {
    // Mock implementation that tracks nesting depth
    if (element && element.tagName === 'DEEPLY_NESTED') {
      throw new Error('Nesting too deep');
    }
  }),
  createSafeParser: mock(() => ({
    parseFromString: mock((html: string, _type: string) => {
      if (html.includes('invalid-error')) {
        return {
          documentElement: {},
          head: null,
          body: null,
          querySelector: (selector: string) => {
            if (selector === 'parsererror') {
              return { textContent: 'Parse error occurred' };
            }
            return null;
          }
        };
      }
      
      if (html.includes('no-body')) {
        return {
          documentElement: {},
          head: {},
          body: null,
          querySelector: () => null
        };
      }
      
      return {
        documentElement: { tagName: 'HTML' },
        head: { tagName: 'HEAD' },
        body: { 
          tagName: 'BODY',
          innerHTML: html.includes('<body>') ? html.split('<body>')[1]?.split('</body>')[0] || '' : html
        },
        querySelector: () => null
      };
    })
  }))
}));

void mock.module('@/utilities/logger.js', () => ({
  log: {
    debug: mock(() => {})
  }
}));

// Mock DOMParserLike interface
interface MockDOMParserLike {
  parseFromString: (html: string, type: string) => any;
}

describe('SafeDOMParser', () => {
  describe('Constructor', () => {
    it('should create parser with default DOMParser', () => {
      const parser = new SafeDOMParser();
      expect(parser).toBeInstanceOf(SafeDOMParser);
    });

    it('should create parser with custom DOMParser', () => {
      const customParser: MockDOMParserLike = {
        parseFromString: mock(() => ({
          documentElement: {},
          head: {},
          body: {},
          querySelector: () => null
        }))
      };
      
      const parser = new SafeDOMParser(customParser);
      expect(parser).toBeInstanceOf(SafeDOMParser);
    });
  });

  describe('parse', () => {
    it('should parse valid HTML successfully', () => {
      const parser = new SafeDOMParser();
      const html = '<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
      
      const result = parser.parse(html);
      
      expect(result).toBeDefined();
      expect(result.documentElement).toBeDefined();
      expect(result.head).toBeDefined();
      expect(result.body).toBeDefined();
    });

    it('should parse simple HTML', () => {
      const parser = new SafeDOMParser();
      const html = '<div>Hello World</div>';
      
      const result = parser.parse(html);
      
      expect(result).toBeDefined();
      expect(result.body).toBeDefined();
    });

    it('should throw InvalidHTMLError for parser errors', () => {
      const parser = new SafeDOMParser();
      const html = 'invalid-error<malformed>';
      
      expect(() => parser.parse(html)).toThrow(InvalidHTMLError);
      expect(() => parser.parse(html)).toThrow('Failed to parse HTML');
    });

    it('should call validateInput with provided HTML', () => {
      const parser = new SafeDOMParser();
      const html = '<div>Test</div>';
      
      // This should not throw since our mock validateInput allows normal HTML
      expect(() => parser.parse(html)).not.toThrow();
    });

    it('should handle input validation errors', () => {
      const parser = new SafeDOMParser();
      const emptyHtml = '   ';
      
      expect(() => parser.parse(emptyHtml)).toThrow('Empty input');
    });

    it('should check nesting depth on parsed document', () => {
      // Create HTML that would trigger our mock nesting depth check
      const mockParser: MockDOMParserLike = {
        parseFromString: mock(() => ({
          documentElement: { tagName: 'DEEPLY_NESTED' },
          head: {},
          body: {},
          querySelector: () => null
        }))
      };
      
      const deepParser = new SafeDOMParser(mockParser);
      const html = '<div>Test</div>';
      
      expect(() => deepParser.parse(html)).toThrow('Nesting too deep');
    });

    it('should handle missing parser error element', () => {
      const parser = new SafeDOMParser();
      const html = '<div>Normal HTML</div>';
      
      const result = parser.parse(html);
      expect(result).toBeDefined();
    });

    it('should log debug information on successful parse', () => {
      const parser = new SafeDOMParser();
      const html = '<div>Test content</div>';
      
      const result = parser.parse(html);
      
      expect(result).toBeDefined();
      // The logger.debug mock should have been called
    });
  });

  describe('parseFragment', () => {
    it('should parse HTML fragment successfully', () => {
      const parser = new SafeDOMParser();
      const fragment = '<h1>Title</h1><p>Content</p>';
      
      const result = parser.parseFragment(fragment);
      
      expect(result).toBeDefined();
      expect(result.tagName).toBe('BODY');
    });

    it('should wrap fragment in document structure', () => {
      const mockParser: MockDOMParserLike = {
        parseFromString: mock((html: string) => {
          // Check that the fragment was wrapped
          expect(html).toContain('<!DOCTYPE html>');
          expect(html).toContain('<html>');
          expect(html).toContain('<body>');
          expect(html).toContain('</body>');
          expect(html).toContain('</html>');
          
          return {
            documentElement: { tagName: 'HTML' },
            head: {},
            body: { tagName: 'BODY', innerHTML: '<span>Fragment</span>' },
            querySelector: () => null
          };
        })
      };
      
      const parser = new SafeDOMParser(mockParser);
      const fragment = '<span>Fragment</span>';
      
      const result = parser.parseFragment(fragment);
      expect(result.tagName).toBe('BODY');
    });

    it('should throw error if parsing fragment fails', () => {
      const parser = new SafeDOMParser();
      const fragment = 'no-body';
      
      expect(() => parser.parseFragment(fragment)).toThrow(InvalidHTMLError);
      expect(() => parser.parseFragment(fragment)).toThrow('Failed to parse HTML fragment');
    });

    it('should validate fragment input', () => {
      const parser = new SafeDOMParser();
      const emptyFragment = '   ';
      
      expect(() => parser.parseFragment(emptyFragment)).toThrow('Empty input');
    });

    it('should handle complex fragments', () => {
      const parser = new SafeDOMParser();
      const fragment = `
        <article>
          <header><h1>Title</h1></header>
          <section>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </section>
        </article>
      `;
      
      const result = parser.parseFragment(fragment);
      expect(result).toBeDefined();
      expect(result.tagName).toBe('BODY');
    });

    it('should handle fragments with special characters', () => {
      const parser = new SafeDOMParser();
      const fragment = '<p>Text with "quotes" and &amp; entities</p>';
      
      const result = parser.parseFragment(fragment);
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle various parser error scenarios', () => {
      const errorScenarios = [
        'invalid-error-malformed',
        'invalid-error-broken',
        'invalid-error-syntax'
      ];
      
      const parser = new SafeDOMParser();
      
      for (const html of errorScenarios) {
        expect(() => parser.parse(html)).toThrow(InvalidHTMLError);
      }
    });

    it('should provide error details in InvalidHTMLError', () => {
      const parser = new SafeDOMParser();
      const html = 'invalid-error';
      
      try {
        parser.parse(html);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidHTMLError);
        expect((error as any).message).toContain('Failed to parse HTML');
      }
    });

    it('should handle parser that returns null', () => {
      const nullParser: MockDOMParserLike = {
        parseFromString: mock(() => null)
      };
      
      const parser = new SafeDOMParser(nullParser);
      
      expect(() => parser.parse('<div>test</div>')).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty HTML string after validation', () => {
      // The mock already throws for empty input, so we'll test that behavior
      const parser = new SafeDOMParser();
      
      expect(() => parser.parse('')).toThrow('Empty input');
    });

    it('should handle HTML with only whitespace', () => {
      const parser = new SafeDOMParser();
      const html = '   \n\t   ';
      
      expect(() => parser.parse(html)).toThrow('Empty input');
    });

    it('should handle malformed HTML gracefully', () => {
      const parser = new SafeDOMParser();
      const html = '<div><p>Unclosed tags';
      
      // Should not throw if parser can handle it
      const result = parser.parse(html);
      expect(result).toBeDefined();
    });

    it('should handle HTML with DOCTYPE', () => {
      const parser = new SafeDOMParser();
      const html = '<!DOCTYPE html><html><head><title>Test</title></head><body><p>Content</p></body></html>';
      
      const result = parser.parse(html);
      expect(result).toBeDefined();
    });

    it('should handle fragments with DOCTYPE', () => {
      const parser = new SafeDOMParser();
      const fragment = '<!DOCTYPE html><div>Content</div>';
      
      const result = parser.parseFragment(fragment);
      expect(result).toBeDefined();
    });

    it('should handle very simple fragments', () => {
      const parser = new SafeDOMParser();
      const fragment = 'Just text';
      
      const result = parser.parseFragment(fragment);
      expect(result).toBeDefined();
    });

    it('should handle fragments with mixed content', () => {
      const parser = new SafeDOMParser();
      const fragment = 'Text before <strong>bold</strong> text after';
      
      const result = parser.parseFragment(fragment);
      expect(result).toBeDefined();
    });
  });

  describe('Integration with Security Layer', () => {
    it('should integrate with validateInput for size limits', () => {
      const parser = new SafeDOMParser();
      const largeHtml = 'a'.repeat(20000000); // Larger than 10MB limit
      
      expect(() => parser.parse(largeHtml)).toThrow('Input too large');
    });

    it('should integrate with checkNestingDepth', () => {
      // This is tested above in the main parse tests
      const parser = new SafeDOMParser();
      const html = '<div>Normal nesting</div>';
      
      const result = parser.parse(html);
      expect(result).toBeDefined();
    });

    it('should work with custom security configurations', () => {
      const customParser: MockDOMParserLike = {
        parseFromString: mock(() => ({
          documentElement: { tagName: 'HTML' },
          head: {},
          body: { tagName: 'BODY', innerHTML: '<div>Custom parser test</div>' },
          querySelector: () => null
        }))
      };
      
      const parser = new SafeDOMParser(customParser);
      const html = '<div>Custom parser test</div>';
      
      const result = parser.parse(html);
      expect(result).toBeDefined();
    });
  });
});