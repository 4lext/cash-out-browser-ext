import { describe, expect, it } from 'bun:test';

import { MarkdownBuilder } from '../markdown-builder.js';
import { convertCode } from './code.js';
import type { ElementLike } from '@/types/dom.js';

describe('Code Converter', () => {
  describe('Inline Code', () => {
    it('should convert simple inline code', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'CODE',
        textContent: 'console.log("hello")',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('`console.log("hello")`');
    });

    it('should handle empty inline code', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: '',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should handle null text content', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: null,
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should escape backticks in inline code', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: 'code with `backticks`',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('`` code with `backticks`  ``');
    });

    it('should handle multiple backticks in inline code', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: 'code with ``` triple backticks',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('```` code with ``` triple backticks ````');
    });

    it('should add spaces when text starts or ends with backtick', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: '`starts and ends`',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('``  `starts and ends`  ``');
    });
  });

  describe('Code Blocks (pre)', () => {
    it('should convert simple pre block', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: 'function hello() {\n  console.log("world");\n}',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      const result = builder.build();
      expect(result).toContain('```');
      expect(result).toContain('function hello()');
    });

    it('should handle pre with nested code element', () => {
      const builder = new MarkdownBuilder();
      const codeElement = {
        tagName: 'CODE',
        textContent: 'const x = 1;',
        getAttribute: (name: string) => name === 'class' ? 'language-javascript' : null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      const preElement = {
        tagName: 'PRE',
        textContent: 'const x = 1;',
        getAttribute: () => null,
        querySelector: (selector: string) => selector === 'code' ? codeElement : null
      } as unknown as ElementLike;
      
      convertCode(preElement, builder);
      
      const result = builder.build();
      expect(result).toContain('```javascript');
      expect(result).toContain('const x = 1;');
    });

    it('should skip empty code blocks', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: '   \n\t   ',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should detect language from class attribute', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: 'print("hello")',
        getAttribute: (name: string) => name === 'class' ? 'language-python' : null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      const result = builder.build();
      expect(result).toContain('```python');
    });
  });

  describe('Language Detection', () => {
    it('should detect language-* pattern', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'CODE',
        textContent: 'code',
        getAttribute: (name: string) => name === 'class' ? 'language-typescript' : null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('`code`');
    });

    it('should detect lang-* pattern', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: 'code',
        getAttribute: (name: string) => name === 'class' ? 'lang-java' : null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      const result = builder.build();
      expect(result).toContain('```java');
    });

    it('should detect highlight-* pattern', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: 'code',
        getAttribute: (name: string) => name === 'class' ? 'highlight-ruby' : null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      const result = builder.build();
      expect(result).toContain('```ruby');
    });

    it('should detect brush: pattern', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: 'code',
        getAttribute: (name: string) => name === 'class' ? 'brush: cpp' : null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      const result = builder.build();
      expect(result).toContain('```cpp');
    });

    it('should detect direct language names', () => {
      const languages = [
        'javascript', 'python', 'java', 'ruby', 'go', 'rust',
        'html', 'css', 'json', 'yaml', 'bash', 'sql'
      ];
      
      for (const lang of languages) {
        const builder = new MarkdownBuilder();
        const element = {
          tagName: 'PRE',
          textContent: 'code',
          getAttribute: (name: string) => name === 'class' ? `code-${lang}` : null,
          querySelector: () => null
        } as unknown as ElementLike;
        
        convertCode(element, builder);
        
        const result = builder.build();
        expect(result).toContain(`\`\`\`${lang}`);
      }
    });

    it('should normalize language aliases', () => {
      const aliases = [
        { input: 'js', expected: 'javascript' },
        { input: 'ts', expected: 'typescript' },
        { input: 'py', expected: 'python' },
        { input: 'rb', expected: 'ruby' },
        { input: 'rs', expected: 'rust' },
        { input: 'cs', expected: 'csharp' },
        { input: 'yml', expected: 'yaml' },
        { input: 'md', expected: 'markdown' },
        { input: 'sh', expected: 'bash' }
      ];
      
      for (const alias of aliases) {
        const builder = new MarkdownBuilder();
        const element = {
          tagName: 'PRE',
          textContent: 'code',
          getAttribute: (name: string) => name === 'class' ? `language-${alias.input}` : null,
          querySelector: () => null
        } as unknown as ElementLike;
        
        convertCode(element, builder);
        
        const result = builder.build();
        expect(result).toContain(`\`\`\`${alias.expected}`);
      }
    });

    it('should handle unknown languages', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: 'code',
        getAttribute: (name: string) => name === 'class' ? 'language-unknownlang' : null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      const result = builder.build();
      expect(result).toContain('```unknownlang');
    });

    it('should handle case insensitive language detection', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: 'code',
        getAttribute: (name: string) => name === 'class' ? 'LANGUAGE-JAVASCRIPT' : null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      const result = builder.build();
      expect(result).toContain('```javascript');
    });

    it('should return undefined for no class attribute', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: 'code without language',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      const result = builder.build();
      expect(result).toContain('```\n'); // No language specified
    });
  });

  describe('Backtick Escaping', () => {
    it('should handle simple text without backticks', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: 'simple text',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('`simple text`');
    });

    it('should handle single backtick', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: 'text with ` backtick',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('`` text with ` backtick ``');
    });

    it('should handle multiple single backticks', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: 'text ` with ` multiple ` backticks',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('`` text ` with ` multiple ` backticks ``');
    });

    it('should handle consecutive backticks', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: 'text with `` double backticks',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('``` text with `` double backticks ```');
    });

    it('should handle very long backtick sequences', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: 'text with ````` five backticks',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('`````` text with ````` five backticks ``````');
    });

    it('should add spaces for text starting with backtick', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: '`starts with backtick',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('``  `starts with backtick ``');
    });

    it('should add spaces for text ending with backtick', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'code',
        textContent: 'ends with backtick`',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('`` ends with backtick`  ``');
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed case tag names', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'CoDe',
        textContent: 'mixed case',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      expect(builder.build()).toBe('`mixed case`');
    });

    it('should handle pre with empty nested code', () => {
      const builder = new MarkdownBuilder();
      const codeElement = {
        tagName: 'CODE',
        textContent: '',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      const preElement = {
        tagName: 'PRE',
        textContent: 'fallback text',
        getAttribute: () => null,
        querySelector: (selector: string) => selector === 'code' ? codeElement : null
      } as unknown as ElementLike;
      
      convertCode(preElement, builder);
      
      expect(builder.build()).toBe('');
    });

    it('should handle complex class attributes', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: 'code',
        getAttribute: (name: string) => name === 'class' ? 'line-numbers language-javascript hljs' : null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      const result = builder.build();
      expect(result).toContain('```javascript');
    });

    it('should handle whitespace in text content', () => {
      const builder = new MarkdownBuilder();
      const element = {
        tagName: 'PRE',
        textContent: '  \n  function test() {\n    return true;\n  }\n  ',
        getAttribute: () => null,
        querySelector: () => null
      } as unknown as ElementLike;
      
      convertCode(element, builder);
      
      const result = builder.build();
      expect(result).toContain('function test()');
      expect(result).toContain('return true;');
    });
  });
});