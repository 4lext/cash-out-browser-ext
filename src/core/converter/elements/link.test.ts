import { describe, expect, it, mock } from 'bun:test';

import { MarkdownBuilder } from '../markdown-builder.js';
import type { ElementLike } from '@/types/dom.js';
import { convertLink } from './link.js';

// Mock the sanitizer module
void mock.module('@/core/security/sanitizer.js', () => ({
  sanitizeUrl: mock((url: string) => {
    // Mock implementation that blocks dangerous URLs
    if (url.startsWith('javascript:') || url.startsWith('data:') || url.includes('evil.com')) {
      return null;
    }
    return url;
  })
}));

describe('Link Converter', () => {
  describe('convertLink', () => {
    it('should convert simple links', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Example Link',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Example Link](https://example.com)');
    });

    it('should handle links without text', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: '',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should handle links with null text content', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: null,
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should handle links with only whitespace text', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: '   \n\t   ',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should trim whitespace from link text', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: '  Example Link  ',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Example Link](https://example.com)');
    });

    it('should handle links without href attribute', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'No Link Text',
        getAttribute: (_name: string) => null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('No Link Text');
    });

    it('should handle links with empty href', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Empty Link',
        getAttribute: (name: string) => name === 'href' ? '' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('Empty Link');
    });

    it('should handle dangerous URLs by outputting text only', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Dangerous Link',
        getAttribute: (name: string) => name === 'href' ? 'javascript:alert("xss")' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('Dangerous Link');
    });

    it('should handle data URLs by outputting text only', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Data URL',
        getAttribute: (name: string) => name === 'href' ? 'data:text/html,<script>alert("xss")</script>' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('Data URL');
    });

    it('should handle blocked domains by outputting text only', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Blocked Link',
        getAttribute: (name: string) => name === 'href' ? 'https://evil.com/malware' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('Blocked Link');
    });
  });

  describe('URL Types', () => {
    it('should handle HTTP URLs', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'HTTP Link',
        getAttribute: (name: string) => name === 'href' ? 'http://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[HTTP Link](http://example.com)');
    });

    it('should handle HTTPS URLs', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'HTTPS Link',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[HTTPS Link](https://example.com)');
    });

    it('should handle relative URLs', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Relative Link',
        getAttribute: (name: string) => name === 'href' ? '/relative/path' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Relative Link](/relative/path)');
    });

    it('should handle anchor links', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Anchor Link',
        getAttribute: (name: string) => name === 'href' ? '#section' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Anchor Link](#section)');
    });

    it('should handle mailto links', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Email Link',
        getAttribute: (name: string) => name === 'href' ? 'mailto:test@example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Email Link](mailto:test@example.com)');
    });

    it('should handle tel links', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Phone Link',
        getAttribute: (name: string) => name === 'href' ? 'tel:+1234567890' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Phone Link](tel:+1234567890)');
    });
  });

  describe('Text Escaping', () => {
    it('should escape square brackets in link text', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Link [with] brackets',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Link \\[with\\] brackets](https://example.com)');
    });

    it('should escape nested brackets', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Link [[nested]] brackets',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Link \\[\\[nested\\]\\] brackets](https://example.com)');
    });

    it('should not escape other special characters in link text', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Link *with* other (special) characters!',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Link *with* other (special) characters!](https://example.com)');
    });

    it('should handle link text with unicode characters', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Enlace con émojis 🔗',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Enlace con émojis 🔗](https://example.com)');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle very long URLs', () => {
      const builder = new MarkdownBuilder();
      const longUrl = 'https://example.com/' + 'a'.repeat(1000);
      const element = {
        textContent: 'Long URL',
        getAttribute: (name: string) => name === 'href' ? longUrl : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe(`[Long URL](${longUrl})`);
    });

    it('should handle very long link text', () => {
      const builder = new MarkdownBuilder();
      const longText = 'A'.repeat(1000);
      const element = {
        textContent: longText,
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe(`[${longText}](https://example.com)`);
    });

    it('should handle URLs with query parameters', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Search Link',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com/search?q=test&page=1' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Search Link](https://example.com/search?q=test&page=1)');
    });

    it('should handle URLs with fragments', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Fragment Link',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com/page#section' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Fragment Link](https://example.com/page#section)');
    });

    it('should handle URLs with special characters', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Special URL',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com/path with spaces' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Special URL](https://example.com/path with spaces)');
    });

    it('should maintain link context in document flow', () => {
      const builder = new MarkdownBuilder();
      builder.add('Here is a ');
      
      const element = {
        textContent: 'link',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      builder.add(' in a sentence.');
      
      expect(builder.build()).toBe('Here is a [link](https://example.com) in a sentence.');
    });
  });

  describe('Edge Cases', () => {
    it('should handle getAttribute returning null for non-href attributes', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Test Link',
        getAttribute: (name: string) => {
          if (name === 'href') return 'https://example.com';
          return null;
        }
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Test Link](https://example.com)');
    });

    it('should handle link text with line breaks', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Link\nwith\nbreaks',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[Link\nwith\nbreaks](https://example.com)');
    });

    it('should handle empty URL after sanitization', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: 'Sanitized Link',
        getAttribute: (name: string) => name === 'href' ? 'javascript:void(0)' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('Sanitized Link');
    });

    it('should handle link with only bracket characters', () => {
      const builder = new MarkdownBuilder();
      const element = {
        textContent: '[]][[',
        getAttribute: (name: string) => name === 'href' ? 'https://example.com' : null
      } as unknown as ElementLike;
      
      convertLink(element, builder);
      
      expect(builder.build()).toBe('[\\[\\]\\]\\[\\[](https://example.com)');
    });
  });
});