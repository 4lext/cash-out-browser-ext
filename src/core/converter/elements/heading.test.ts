import { describe, expect, it } from 'bun:test';

import { MarkdownBuilder } from '../markdown-builder.js';
import type { ElementLike } from '@/types/dom.js';
import { convertHeading } from './heading.js';

describe('Heading Converter', () => {
  describe('convertHeading', () => {
    it('should convert h1 element', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: 'Main Title',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('# Main Title');
    });

    it('should convert h2 element', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H2',
        textContent: 'Section Title',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('## Section Title');
    });

    it('should convert h3 element', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H3',
        textContent: 'Subsection Title',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('### Subsection Title');
    });

    it('should convert h4 element', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H4',
        textContent: 'Minor Title',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('#### Minor Title');
    });

    it('should convert h5 element', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H5',
        textContent: 'Small Title',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('##### Small Title');
    });

    it('should convert h6 element', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H6',
        textContent: 'Smallest Title',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('###### Smallest Title');
    });

    it('should handle lowercase tag names', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'h1',
        textContent: 'Lowercase Tag',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('# Lowercase Tag');
    });

    it('should handle empty headings', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: '',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should handle headings with only whitespace', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: '   \n\t   ',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should trim whitespace from headings', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: '  Title with spaces  ',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('# Title with spaces');
    });
  });

  describe('Nested Content Handling', () => {
    it('should extract text from nested elements', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: 'Title with bold text',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('# Title with bold text');
    });

    it('should handle deeply nested elements', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H2',
        textContent: 'Title with nested formatting',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('## Title with nested formatting');
    });

    it('should handle mixed content types', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H3',
        textContent: 'Mixed code and link content',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('### Mixed code and link content');
    });

    it('should handle elements with no text content', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: '',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should handle elements with null textContent', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: null,
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle headings with special characters', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: 'Title with *special* characters!',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('# Title with *special* characters!');
    });

    it('should handle headings with unicode characters', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: 'Título con émojis 🎉',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('# Título con émojis 🎉');
    });

    it('should handle very long headings', () => {
      const builder = new MarkdownBuilder();
      const longTitle = 'This is a very long heading that could potentially cause issues with rendering or processing in some systems but should be handled gracefully by the converter';
      const element = {
        tagName: 'H1',
        textContent: longTitle,
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe(`# ${longTitle}`);
    });

    it('should handle headings with line breaks', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: 'Title\nwith\nline\nbreaks',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('# Title\nwith\nline\nbreaks');
    });

    it('should preserve proper spacing in output', () => {
      const builder = new MarkdownBuilder();
      builder.addLine('Before heading');
      
      const element = {
        tagName: 'H1',
        textContent: 'Main Title',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      builder.addLine('After heading');
      
      expect(builder.build()).toBe('Before heading\n\n# Main Title\n\nAfter heading');
    });
  });

  describe('Edge Cases', () => {
    it('should handle elements with mixed text and whitespace nodes', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: '  Title  ',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('# Title');
    });

    it('should handle empty nested elements', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: 'Title  End',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('# Title  End');
    });

    it('should handle heading with only nested empty elements', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'H1',
        textContent: '',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertHeading(element, builder);
      
      expect(builder.build()).toBe('');
    });
  });
});