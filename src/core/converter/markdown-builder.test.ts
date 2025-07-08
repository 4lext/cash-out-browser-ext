import { describe, expect, it } from 'bun:test';

import { MarkdownBuilder } from './markdown-builder.js';

describe('MarkdownBuilder', () => {
  describe('Basic Operations', () => {
    it('should create an empty builder', () => {
      const builder = new MarkdownBuilder();
      expect(builder.build()).toBe('');
      expect(builder.length).toBe(0);
      expect(builder.indentLevel).toBe(0);
    });

    it('should add text with add()', () => {
      const builder = new MarkdownBuilder();
      builder.add('Hello').add(' ').add('World');
      expect(builder.build()).toBe('Hello World');
      expect(builder.length).toBe(11);
    });

    it('should ignore empty text in add()', () => {
      const builder = new MarkdownBuilder();
      builder.add('Hello').add('').add('World');
      expect(builder.build()).toBe('HelloWorld');
    });

    it('should add lines with addLine()', () => {
      const builder = new MarkdownBuilder();
      builder.addLine('Line 1').addLine('Line 2');
      expect(builder.build()).toBe('Line 1\nLine 2');
    });

    it('should add empty lines with addLine()', () => {
      const builder = new MarkdownBuilder();
      builder.addLine('Line 1').addLine().addLine('Line 2');
      expect(builder.build()).toBe('Line 1\n\nLine 2');
    });

    it('should handle blank lines properly', () => {
      const builder = new MarkdownBuilder();
      builder.addLine('Line 1').addBlankLine().addLine('Line 2');
      expect(builder.build()).toBe('Line 1\n\nLine 2');
    });

    it('should prevent multiple consecutive blank lines', () => {
      const builder = new MarkdownBuilder();
      builder.addLine('Line 1').addBlankLine().addBlankLine().addBlankLine().addLine('Line 2');
      expect(builder.build()).toBe('Line 1\n\nLine 2');
    });
  });

  describe('Indentation', () => {
    it('should handle indentation with indent()', () => {
      const builder = new MarkdownBuilder();
      builder.addLine('Level 0').indent().addLine('Level 1').indent().addLine('Level 2');
      expect(builder.build()).toBe('Level 0\n  Level 1\n    Level 2');
      expect(builder.indentLevel).toBe(4);
    });

    it('should handle outdentation with outdent()', () => {
      const builder = new MarkdownBuilder();
      builder.addLine('Start'); // Add a baseline to prevent trimming
      builder.indent(4).addLine('Level 2').outdent().addLine('Level 1').outdent().addLine('Level 0');
      expect(builder.build()).toBe('Start\n    Level 2\n  Level 1\nLevel 0');
      expect(builder.indentLevel).toBe(0);
    });

    it('should not indent below 0', () => {
      const builder = new MarkdownBuilder();
      builder.outdent(10).addLine('Level 0');
      expect(builder.build()).toBe('Level 0');
      expect(builder.indentLevel).toBe(0);
    });

    it('should support custom indentation amounts', () => {
      const builder = new MarkdownBuilder();
      builder.addLine('Start'); // Prevent trimming
      builder.indent(4).addLine('4 spaces').outdent(2).addLine('2 spaces');
      expect(builder.build()).toBe('Start\n    4 spaces\n  2 spaces');
      expect(builder.indentLevel).toBe(2);
    });
  });

  describe('Headings', () => {
    it('should add headings with proper ATX format', () => {
      const builder = new MarkdownBuilder();
      builder.addHeading(1, 'H1').addHeading(2, 'H2').addHeading(3, 'H3');
      expect(builder.build()).toBe('# H1\n\n## H2\n\n### H3');
    });

    it('should handle all heading levels 1-6', () => {
      const builder = new MarkdownBuilder();
      for (let i = 1; i <= 6; i++) {
        builder.addHeading(i, `Heading ${i}`);
      }
      const result = builder.build();
      expect(result).toContain('# Heading 1');
      expect(result).toContain('## Heading 2');
      expect(result).toContain('### Heading 3');
      expect(result).toContain('#### Heading 4');
      expect(result).toContain('##### Heading 5');
      expect(result).toContain('###### Heading 6');
    });

    it('should clamp heading levels to 1-6', () => {
      const builder = new MarkdownBuilder();
      builder.addHeading(0, 'Invalid Low').addHeading(10, 'Invalid High');
      expect(builder.build()).toBe('# Invalid Low\n\n###### Invalid High');
    });

    it('should handle headings with blank lines', () => {
      const builder = new MarkdownBuilder();
      builder.addLine('Before').addHeading(1, 'Title').addLine('After');
      expect(builder.build()).toBe('Before\n\n# Title\n\nAfter');
    });
  });

  describe('Paragraphs', () => {
    it('should add simple paragraphs', () => {
      const builder = new MarkdownBuilder();
      builder.addParagraph('This is a paragraph.');
      expect(builder.build()).toBe('This is a paragraph.');
    });

    it('should skip empty paragraphs', () => {
      const builder = new MarkdownBuilder();
      builder.addParagraph('').addParagraph('   ').addParagraph('Real content');
      expect(builder.build()).toBe('Real content');
    });

    it('should wrap text at 80 characters', () => {
      const builder = new MarkdownBuilder();
      const longText = 'This is a very long sentence that should be wrapped at 80 characters to ensure proper formatting in the markdown output.';
      builder.addParagraph(longText);
      const result = builder.build();
      const lines = result.split('\n');
      expect(lines[0]?.length || 0).toBeLessThanOrEqual(80);
      expect(lines[1]?.length || 0).toBeLessThanOrEqual(80);
    });

    it('should handle words longer than 80 characters', () => {
      const builder = new MarkdownBuilder();
      const longWord = 'a'.repeat(100);
      builder.addParagraph(`Short ${longWord} text`);
      const result = builder.build();
      expect(result).toContain(longWord);
    });

    it('should preserve paragraph spacing', () => {
      const builder = new MarkdownBuilder();
      builder.addParagraph('Para 1').addParagraph('Para 2');
      expect(builder.build()).toBe('Para 1\n\nPara 2');
    });
  });

  describe('Code Blocks', () => {
    it('should add code blocks without language', () => {
      const builder = new MarkdownBuilder();
      builder.addCodeBlock('console.log("Hello");');
      expect(builder.build()).toBe('```\nconsole.log("Hello");\n```');
    });

    it('should add code blocks with language', () => {
      const builder = new MarkdownBuilder();
      builder.addCodeBlock('console.log("Hello");', 'javascript');
      expect(builder.build()).toBe('```javascript\nconsole.log("Hello");\n```');
    });

    it('should handle multi-line code', () => {
      const builder = new MarkdownBuilder();
      const code = 'function hello() {\n  console.log("Hello");\n}';
      builder.addCodeBlock(code, 'javascript');
      expect(builder.build()).toBe('```javascript\nfunction hello() {\n  console.log("Hello");\n}\n```');
    });

    it('should handle empty code blocks', () => {
      const builder = new MarkdownBuilder();
      builder.addCodeBlock('');
      expect(builder.build()).toBe('```\n\n```');
    });

    it('should maintain proper spacing around code blocks', () => {
      const builder = new MarkdownBuilder();
      builder.addLine('Before').addCodeBlock('code').addLine('After');
      expect(builder.build()).toBe('Before\n\n```\ncode\n```\n\nAfter');
    });
  });

  describe('Blockquotes', () => {
    it('should add simple blockquotes', () => {
      const builder = new MarkdownBuilder();
      builder.addBlockquote('This is a quote.');
      expect(builder.build()).toBe('> This is a quote.');
    });

    it('should handle multi-line blockquotes', () => {
      const builder = new MarkdownBuilder();
      builder.addBlockquote('Line 1\nLine 2\nLine 3');
      expect(builder.build()).toBe('> Line 1\n> Line 2\n> Line 3');
    });

    it('should handle empty lines in blockquotes', () => {
      const builder = new MarkdownBuilder();
      builder.addBlockquote('Line 1\n\nLine 3');
      expect(builder.build()).toBe('> Line 1\n>\n> Line 3');
    });

    it('should maintain proper spacing after blockquotes', () => {
      const builder = new MarkdownBuilder();
      builder.addBlockquote('Quote').addLine('After');
      expect(builder.build()).toBe('> Quote\n\nAfter');
    });
  });

  describe('List Items', () => {
    it('should add unordered list items', () => {
      const builder = new MarkdownBuilder();
      builder.addListItem('Item 1').addListItem('Item 2');
      expect(builder.build()).toBe('- Item 1\n- Item 2');
    });

    it('should add ordered list items', () => {
      const builder = new MarkdownBuilder();
      builder.addListItem('Item 1', true, 1).addListItem('Item 2', true, 2);
      expect(builder.build()).toBe('1. Item 1\n2. Item 2');
    });

    it('should handle nested list items with indentation', () => {
      const builder = new MarkdownBuilder();
      builder.addListItem('Item 1')
        .indent()
        .addListItem('Sub item 1')
        .addListItem('Sub item 2')
        .outdent()
        .addListItem('Item 2');
      expect(builder.build()).toBe('- Item 1\n  - Sub item 1\n  - Sub item 2\n- Item 2');
    });

    it('should handle mixed list types', () => {
      const builder = new MarkdownBuilder();
      builder.addListItem('Unordered', false)
        .indent()
        .addListItem('Ordered sub', true, 1)
        .addListItem('Ordered sub 2', true, 2);
      expect(builder.build()).toBe('- Unordered\n  1. Ordered sub\n  2. Ordered sub 2');
    });
  });

  describe('Build Method', () => {
    it('should normalize line endings', () => {
      const builder = new MarkdownBuilder();
      builder.add('Line 1\r\nLine 2\r\nLine 3');
      expect(builder.build()).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should remove trailing whitespace', () => {
      const builder = new MarkdownBuilder();
      builder.add('Line with spaces   \nAnother line  \t\n');
      expect(builder.build()).toBe('Line with spaces\nAnother line');
    });

    it('should limit consecutive blank lines to 2', () => {
      const builder = new MarkdownBuilder();
      builder.add('Line 1\n\n\n\n\nLine 2');
      expect(builder.build()).toBe('Line 1\n\nLine 2');
    });

    it('should trim the final result', () => {
      const builder = new MarkdownBuilder();
      builder.add('\n\n  Content  \n\n');
      expect(builder.build()).toBe('Content');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete document structure', () => {
      const builder = new MarkdownBuilder();
      builder
        .addHeading(1, 'Main Title')
        .addParagraph('This is the introduction paragraph.')
        .addHeading(2, 'Section 1')
        .addParagraph('Some content here.')
        .addListItem('First item')
        .addListItem('Second item')
        .addHeading(2, 'Code Example')
        .addCodeBlock('const x = 1;', 'javascript')
        .addBlockquote('This is a quote from someone important.');

      const result = builder.build();
      expect(result).toContain('# Main Title');
      expect(result).toContain('## Section 1');
      expect(result).toContain('- First item');
      expect(result).toContain('```javascript');
      expect(result).toContain('> This is a quote');
    });

    it('should handle edge cases with empty and whitespace content', () => {
      const builder = new MarkdownBuilder();
      builder
        .add('')
        .addLine()
        .addParagraph('   ')
        .addBlankLine()
        .addParagraph('Real content')
        .addBlankLine()
        .addBlankLine();

      expect(builder.build()).toBe('Real content');
    });

    it('should maintain proper indentation in complex nesting', () => {
      const builder = new MarkdownBuilder();
      builder
        .addListItem('Level 1')
        .indent()
        .addListItem('Level 2')
        .indent()
        .addListItem('Level 3')
        .outdent()
        .addListItem('Back to Level 2')
        .outdent()
        .addListItem('Back to Level 1');

      const result = builder.build();
      expect(result).toContain('- Level 1');
      expect(result).toContain('  - Level 2');
      expect(result).toContain('    - Level 3');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long content efficiently', () => {
      const builder = new MarkdownBuilder();
      const longText = 'A'.repeat(1000); // Reduced size for faster test
      builder.addParagraph(longText);
      
      const result = builder.build();
      expect(result.length).toBeGreaterThan(100);
      expect(builder.length).toBeGreaterThan(100);
    });

    it('should handle special characters in content', () => {
      const builder = new MarkdownBuilder();
      builder.addParagraph('Content with émojis 🎉 and ünïcödé');
      expect(builder.build()).toBe('Content with émojis 🎉 and ünïcödé');
    });

    it('should maintain state correctly across operations', () => {
      const builder = new MarkdownBuilder();
      
      // Initial state
      expect(builder.indentLevel).toBe(0);
      expect(builder.length).toBe(0);
      
      // After adding content
      builder.add('test');
      expect(builder.length).toBe(4);
      
      // After indenting
      builder.indent(4);
      expect(builder.indentLevel).toBe(4);
      
      // After building (should not change state)
      const result = builder.build();
      expect(builder.indentLevel).toBe(4);
      expect(result).toBe('test');
    });
  });
});