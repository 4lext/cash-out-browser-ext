/**
 * Code converter (code/pre elements)
 */

import { MarkdownBuilder } from '../markdown-builder.js';
import type { ElementLike } from '@/types/dom.js';

export function convertCode(element: ElementLike, builder: MarkdownBuilder): void {
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'code') {
    // Inline code
    const text = element.textContent || '';
    if (text) {
      builder.add(escapeBackticks(text));
    }
  } else if (tagName === 'pre') {
    // Code block
    convertCodeBlock(element, builder);
  }
}

/**
 * Convert pre element to code block
 */
function convertCodeBlock(element: ElementLike, builder: MarkdownBuilder): void {
  // Check if there's a code element inside
  const codeElement = element.querySelector('code');
  const sourceElement = codeElement || element;
  
  // Get the code text
  const code = sourceElement.textContent || '';
  
  if (!code.trim()) {
    return;
  }
  
  // Try to detect language from class names
  const language = detectLanguage(sourceElement);
  
  // Add the code block
  builder.addCodeBlock(code, language);
}

/**
 * Detect programming language from element classes
 */
function detectLanguage(element: ElementLike): string | undefined {
  const className = element.getAttribute('class') || '';
  
  if (!className) {
    return undefined;
  }
  
  // Common patterns: language-js, lang-js, js, javascript
  const patterns = [
    /language-(\w+)/,
    /lang-(\w+)/,
    /highlight-(\w+)/,
    /brush:\s*(\w+)/,
  ];
  
  for (const pattern of patterns) {
    const match = className.match(pattern);
    if (match) {
      const lang = match[1];
      if (lang) {
        return normalizeLanguage(lang);
      }
    }
  }
  
  // Check for direct language names in class
  const languages = [
    'javascript', 'typescript', 'python', 'java', 'csharp', 
    'cpp', 'ruby', 'golang', 'rust', 'php', 'swift', 'kotlin', 
    'scala', 'html', 'css', 'scss', 'sass', 'less', 'xml', 
    'json', 'yaml', 'markdown', 'bash', 'shell', 'sql', 
    'graphql', 'dockerfile', 'makefile',
    // Short aliases should be checked last and with word boundaries
    'js', 'ts', 'py', 'cs', 'rb', 'go', 'rs', 'yml', 'md', 'sh', 'c'
  ];
  
  const classLower = className.toLowerCase();
  const classWords = classLower.split(/[\s\-_]+/);
  
  for (const lang of languages) {
    // Check if the language appears as a complete word
    if (classWords.includes(lang)) {
      return normalizeLanguage(lang);
    }
  }
  
  return undefined;
}

/**
 * Normalize language names
 */
function normalizeLanguage(lang: string): string {
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'rs': 'rust',
    'cs': 'csharp',
    'yml': 'yaml',
    'md': 'markdown',
    'sh': 'bash',
  };
  
  return langMap[lang.toLowerCase()] || lang.toLowerCase();
}

/**
 * Escape backticks in inline code
 */
function escapeBackticks(text: string): string {
  // If the text contains backticks, we need to use more backticks
  if (text.includes('`')) {
    // Find the longest sequence of backticks
    const matches = text.match(/`+/g) || [];
    const maxLength = Math.max(...matches.map(m => m.length), 0);
    
    // Use one more backtick than the longest sequence
    const fence = '`'.repeat(maxLength + 1);
    
    // Add spaces around content when using multiple backticks
    // Add extra space if content starts/ends with backtick to prevent ambiguity
    let startSpace = ' ';
    let endSpace = ' ';
    
    if (text.startsWith('`')) {
      startSpace = '  ';
    }
    if (text.endsWith('`')) {
      endSpace = '  ';
    }
    
    return fence + startSpace + text + endSpace + fence;
  }
  
  // For simple text without backticks, just wrap in single backticks
  return '`' + text + '`';
}