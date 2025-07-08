import { describe, expect, it } from 'bun:test';

import { MarkdownBuilder } from '../markdown-builder.js';
import type { TextLike } from '@/types/dom.js';
import { convertText } from './text.js';

describe('Text Converter', () => {
  describe('convertText', () => {
    it('should convert simple text', () => {
      const builder = new MarkdownBuilder();
      const textNode = { 
        textContent: 'Hello World',
        data: 'Hello World',
        length: 11,
        wholeText: 'Hello World'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('Hello World');
    });

    it('should handle empty text content', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: '',
        data: '',
        length: 0,
        wholeText: ''
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should handle null text content', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: null,
        data: '',
        length: 0,
        wholeText: ''
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should preserve single spaces', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: ' ',
        data: ' ',
        length: 1,
        wholeText: ' '
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe(''); // Single space gets trimmed by builder
    });

    it('should preserve single newlines as spaces', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: '\n',
        data: '\n',
        length: 1,
        wholeText: '\n'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should preserve multiple spaces and normalize them', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: '   Hello     World   ',
        data: '   Hello     World   ',
        length: 21,
        wholeText: '   Hello     World   '
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      // The MarkdownBuilder trims leading/trailing spaces but preserves internal spaces
      expect(builder.build()).toBe('Hello     World');
    });

    it('should handle text with newlines', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: 'First line\nSecond line',
        data: 'First line\nSecond line',
        length: 22,
        wholeText: 'First line\nSecond line'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('First line\nSecond line');
    });

    it('should handle text with multiple newlines', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: 'First\n\n\nSecond',
        data: 'First\n\n\nSecond',
        length: 14,
        wholeText: 'First\n\n\nSecond'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      // Multiple newlines are normalized to max 2
      expect(builder.build()).toBe('First\n\nSecond');
    });

    it('should handle mixed whitespace', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: '  \t\n  Text  \n\t  ',
        data: '  \t\n  Text  \n\t  ',
        length: 16,
        wholeText: '  \t\n  Text  \n\t  '
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      // Whitespace is trimmed and normalized
      expect(builder.build()).toBe('Text');
    });

    it('should handle special characters', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: 'Text with *asterisks* and _underscores_',
        data: 'Text with *asterisks* and _underscores_',
        length: 40,
        wholeText: 'Text with *asterisks* and _underscores_'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('Text with *asterisks* and _underscores_');
    });

    it('should handle HTML entities', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: 'Text with &amp; &lt; &gt; entities',
        data: 'Text with &amp; &lt; &gt; entities',
        length: 35,
        wholeText: 'Text with &amp; &lt; &gt; entities'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('Text with &amp; &lt; &gt; entities');
    });

    it('should handle unicode characters', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: 'Unicode: émojis 🎉 and symbols ™®',
        data: 'Unicode: émojis 🎉 and symbols ™®',
        length: 33,
        wholeText: 'Unicode: émojis 🎉 and symbols ™®'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('Unicode: émojis 🎉 and symbols ™®');
    });

    it('should handle very long text', () => {
      const builder = new MarkdownBuilder();
      const longText = 'A'.repeat(10000);
      const textNode = {
        textContent: longText,
        data: longText,
        length: 10000,
        wholeText: longText
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe(longText);
    });

    it('should handle Windows line endings', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: 'First\r\nSecond',
        data: 'First\r\nSecond',
        length: 13,
        wholeText: 'First\r\nSecond'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      // Windows line endings are normalized to Unix
      expect(builder.build()).toBe('First\nSecond');
    });

    it('should handle tab characters', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: 'Column1\tColumn2\tColumn3',
        data: 'Column1\tColumn2\tColumn3',
        length: 23,
        wholeText: 'Column1\tColumn2\tColumn3'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('Column1\tColumn2\tColumn3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle text nodes with only whitespace', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: '   \t\n   ',
        data: '   \t\n   ',
        length: 8,
        wholeText: '   \t\n   '
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      // Whitespace-only text is trimmed to empty
      expect(builder.build()).toBe('');
    });

    it('should handle empty string vs null distinction', () => {
      const builder1 = new MarkdownBuilder();
      const emptyNode = {
        textContent: '',
        data: '',
        length: 0,
        wholeText: ''
      } as unknown as TextLike;
      
      convertText(emptyNode, builder1);
      expect(builder1.build()).toBe('');
      
      const builder2 = new MarkdownBuilder();
      const nullNode = {
        textContent: null,
        data: '',
        length: 0,
        wholeText: ''
      } as unknown as TextLike;
      
      convertText(nullNode, builder2);
      expect(builder2.build()).toBe('');
    });

    it('should handle text that looks like markdown', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: '# Not a heading\n> Not a quote',
        data: '# Not a heading\n> Not a quote',
        length: 29,
        wholeText: '# Not a heading\n> Not a quote'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('# Not a heading\n> Not a quote');
    });

    it('should handle escape sequences', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: 'Text with \\n escape and \\t sequences',
        data: 'Text with \\n escape and \\t sequences',
        length: 36,
        wholeText: 'Text with \\n escape and \\t sequences'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('Text with \\n escape and \\t sequences');
    });

    it('should handle zero-width characters', () => {
      const builder = new MarkdownBuilder();
      const textNode = {
        textContent: 'Text\u200Bwith\u200Bzero-width\u200Bspaces',
        data: 'Text\u200Bwith\u200Bzero-width\u200Bspaces',
        length: 29,
        wholeText: 'Text\u200Bwith\u200Bzero-width\u200Bspaces'
      } as unknown as TextLike;
      
      convertText(textNode, builder);
      
      expect(builder.build()).toBe('Text\u200Bwith\u200Bzero-width\u200Bspaces');
    });
  });

  describe('Context Integration', () => {
    it('should work within a document flow', () => {
      const builder = new MarkdownBuilder();
      
      builder.add('Before text. ');
      const textNode = {
        textContent: 'Text content',
        data: 'Text content',
        length: 12,
        wholeText: 'Text content'
      } as unknown as TextLike;
      convertText(textNode, builder);
      builder.add(' After text.');
      
      expect(builder.build()).toBe('Before text. Text content After text.');
    });

    it('should handle multiple consecutive text nodes', () => {
      const builder = new MarkdownBuilder();
      
      const node1 = {
        textContent: 'First',
        data: 'First',
        length: 5,
        wholeText: 'First'
      } as unknown as TextLike;
      
      const node2 = {
        textContent: ' ',
        data: ' ',
        length: 1,
        wholeText: ' '
      } as unknown as TextLike;
      
      const node3 = {
        textContent: 'Second',
        data: 'Second',
        length: 6,
        wholeText: 'Second'
      } as unknown as TextLike;
      
      convertText(node1, builder);
      convertText(node2, builder);
      convertText(node3, builder);
      
      expect(builder.build()).toBe('First Second');
    });
  });
});