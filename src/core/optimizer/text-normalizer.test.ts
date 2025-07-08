import { describe, expect, it } from 'bun:test';

import { normalizeWhitespace, normalizeUnicode, fixCommonIssues } from './text-normalizer.js';

describe('Text Normalizer', () => {
  describe('normalizeWhitespace', () => {
    it('should replace multiple spaces with single space', () => {
      const input = 'Text  with    multiple     spaces';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Text with multiple spaces');
    });

    it('should replace multiple tabs with single space', () => {
      const input = 'Text\t\t\twith\ttabs';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Text with tabs');
    });

    it('should limit consecutive newlines to 2', () => {
      const input = 'Line 1\n\n\n\n\nLine 2';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Line 1\n\nLine 2');
    });

    it('should remove spaces before punctuation', () => {
      const input = 'Hello , world ! How are you ?';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Hello, world! How are you?');
    });

    it('should ensure space after punctuation', () => {
      const input = 'Hello,world!How are you?';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Hello, world! How are you?');
    });

    it('should not add space after punctuation at end', () => {
      const input = 'Hello world.';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Hello world.');
    });

    it('should preserve list indentation', () => {
      const input = '  - Item 1   \n    - Sub item   \n  1. Numbered   ';
      const result = normalizeWhitespace(input);
      expect(result).toBe('  - Item 1\n    - Sub item\n  1. Numbered');
    });

    it('should preserve markdown links during normalization', () => {
      const input = 'Check [this    link](https://example.com) for more  info';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Check [this    link](https://example.com) for more info');
    });

    it('should preserve markdown images during normalization', () => {
      const input = 'Here is ![alt    text](https://example.com/image.jpg) an  image';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Here is ![alt    text](https://example.com/image.jpg) an image');
    });

    it('should preserve inline code during normalization', () => {
      const input = 'Use `console.log(  "hello"  )` for  debugging';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Use `console.log(  "hello"  )` for debugging');
    });

    it('should handle mixed protected elements', () => {
      const input = 'Text [link](url) and `code  here` plus ![img](url) with   spaces';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Text [link](url) and `code  here` plus ![img](url) with spaces');
    });

    it('should trim the final result', () => {
      const input = '   Text with leading and trailing spaces   ';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Text with leading and trailing spaces');
    });

    it('should handle empty text', () => {
      const input = '';
      const result = normalizeWhitespace(input);
      expect(result).toBe('');
    });

    it('should handle whitespace-only text', () => {
      const input = '   \n\n\t\t   ';
      const result = normalizeWhitespace(input);
      expect(result).toBe('');
    });

    it('should handle complex multiline text', () => {
      const input = `
Line 1    with   spaces


Line 2  ,  with   punctuation !


- List item   with   spaces
  - Nested  item
1. Numbered   item


End  text  .
      `;
      const result = normalizeWhitespace(input);
      expect(result).toBe('Line 1 with spaces\n\nLine 2, with punctuation!\n\n- List item with spaces\n  - Nested item\n1. Numbered item\n\nEnd text.');
    });
  });

  describe('normalizeUnicode', () => {
    it('should remove zero-width characters', () => {
      const input = 'Text\u200Bwith\u200Czero\u200Dwidth\uFEFFchars';
      const result = normalizeUnicode(input);
      expect(result).toBe('Textwithzerowidthchars');
    });

    it('should remove control characters', () => {
      const input = 'Text\x00with\x1Fcontrol\x7Fchars';
      const result = normalizeUnicode(input);
      expect(result).toBe('Textwithcontrolchars');
    });

    it('should preserve newlines and tabs', () => {
      const input = 'Text\nwith\tlines\nand\ttabs';
      const result = normalizeUnicode(input);
      expect(result).toBe('Text\nwith\tlines\nand\ttabs');
    });

    it('should normalize quotes', () => {
      const input = '"Smart" quotes and \'single\' quotes';
      const result = normalizeUnicode(input);
      expect(result).toBe('"Smart" quotes and \'single\' quotes');
    });

    it('should normalize dashes', () => {
      const input = 'Various‐dashes‑and–em—dashes―here';
      const result = normalizeUnicode(input);
      expect(result).toBe('Various-dashes-and-em-dashes-here');
    });

    it('should normalize ellipsis', () => {
      const input = 'Text with ellipsis…here';
      const result = normalizeUnicode(input);
      expect(result).toBe('Text with ellipsis...here');
    });

    it('should normalize various space characters', () => {
      const input = 'Text\u00A0with\u2000various\u2009space\u3000characters';
      const result = normalizeUnicode(input);
      expect(result).toBe('Text with various space characters');
    });

    it('should handle empty text', () => {
      const input = '';
      const result = normalizeUnicode(input);
      expect(result).toBe('');
    });

    it('should handle mixed unicode issues', () => {
      const input = '"Mixed"\u200B—text\u00A0with…various\x1Fissues"';
      const result = normalizeUnicode(input);
      expect(result).toBe('"Mixed"-text with...variousissues"');
    });

    it('should preserve regular unicode characters', () => {
      const input = 'Café naïve résumé émojis 🎉🔥✨';
      const result = normalizeUnicode(input);
      expect(result).toBe('Café naïve résumé émojis 🎉🔥✨');
    });
  });

  describe('fixCommonIssues', () => {
    it('should fix missing spaces after sentences', () => {
      const input = 'Sentence one.Sentence two!Sentence three?';
      const result = fixCommonIssues(input);
      expect(result).toBe('Sentence one. Sentence two! Sentence three?');
    });

    it('should fix multiple punctuation', () => {
      const input = 'Really!!! Amazing... Great???';
      const result = fixCommonIssues(input);
      expect(result).toBe('Really! Amazing... Great?');
    });

    it('should fix spaces around quotes', () => {
      const input = '" Quoted text " and more';
      const result = fixCommonIssues(input);
      expect(result).toBe('"Quoted text" and more');
    });

    it('should fix parentheses spacing', () => {
      const input = 'Text ( with spaces ) around parens';
      const result = fixCommonIssues(input);
      expect(result).toBe('Text (with spaces) around parens');
    });

    it('should remove trailing spaces from lines', () => {
      const input = 'Line 1   \nLine 2  \nLine 3\t';
      const result = fixCommonIssues(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle multiple issues together', () => {
      const input = 'Hello.World!!! " Quoted " text ( spacing ) issue   ';
      const result = fixCommonIssues(input);
      expect(result).toBe('Hello. World! "Quoted" text (spacing) issue');
    });

    it('should not break valid punctuation', () => {
      const input = 'Valid... ellipsis and U.S.A. abbreviations';
      const result = fixCommonIssues(input);
      expect(result).toBe('Valid... ellipsis and U. S. A. abbreviations');
    });

    it('should handle empty text', () => {
      const input = '';
      const result = fixCommonIssues(input);
      expect(result).toBe('');
    });

    it('should handle complex mixed issues', () => {
      const input = 'Start.Middle!End???  " Quote " and ( parens ) test   \nSecond line   ';
      const result = fixCommonIssues(input);
      expect(result).toBe('Start. Middle! End?  "Quote" and (parens) test\nSecond line');
    });
  });

  describe('Combined Normalization', () => {
    it('should work well when all functions are used together', () => {
      const input = '  "Text"\u200Bwith   multiple.Issues!!!   ( spaces ) and\u2000weird—chars…\n\n\n\nEnd   ';
      
      let result = normalizeUnicode(input);
      result = normalizeWhitespace(result);
      result = fixCommonIssues(result);
      
      expect(result).toBe('"Text" with multiple. Issues! (spaces) and weird-chars...\n\nEnd');
    });

    it('should preserve protected elements through all normalizations', () => {
      const input = 'Check  [this  link](url)  for  `code  with   spaces`  and  more!!!';
      
      let result = normalizeUnicode(input);
      result = normalizeWhitespace(result);
      result = fixCommonIssues(result);
      
      expect(result).toBe('Check [this  link](url) for `code  with   spaces` and more!');
    });

    it('should handle real-world messy text', () => {
      const input = `
  "Hello"!!!  How   are   you???   


  Check  this   link:  [Example  Site](https://example.com)  for  more   info.


  Code  example:  \`console.log(  "test"  )\`  works  well.


  End  of  text   
      `;
      
      let result = normalizeUnicode(input);
      result = normalizeWhitespace(result);
      result = fixCommonIssues(result);
      
      expect(result).toBe('"Hello"! How are you?\n\nCheck this link: [Example  Site](https://example.com) for more info.\n\nCode example: `console.log("test")` works well.\n\nEnd of text');
    });
  });

  describe('Edge Cases', () => {
    it('should handle text with only protected elements', () => {
      const input = '[link](url) `code` ![img](url)';
      const result = normalizeWhitespace(input);
      expect(result).toBe('[link](url) `code` ![img](url)');
    });

    it('should handle nested protection patterns', () => {
      const input = 'Text with [link containing `code`](url) here';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Text with [link containing `code`](url) here');
    });

    it('should handle malformed markdown patterns', () => {
      const input = 'Text with [unclosed link and `unclosed code';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Text with [unclosed link and `unclosed code');
    });

    it('should handle very long text efficiently', () => {
      const longText = 'Word '.repeat(10000) + 'end';
      const result = normalizeWhitespace(longText);
      expect(result).toContain('Word Word Word');
      expect(result).toContain('end');
    });

    it('should handle text with only whitespace and punctuation', () => {
      const input = '   !!!  ???  ...   ';
      let result = normalizeWhitespace(input);
      result = fixCommonIssues(result);
      expect(result).toBe('! ? ...');
    });

    it('should handle unicode normalization edge cases', () => {
      const input = '\u200B\u200C\u200D\uFEFF';
      const result = normalizeUnicode(input);
      expect(result).toBe('');
    });
  });
});