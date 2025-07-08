/**
 * Text normalization for clean LLM-friendly output
 */

/**
 * Normalize whitespace in text
 */
export function normalizeWhitespace(text: string): string {
 // First, protect URLs and code blocks from normalization
 const protectedElements: string[] = [];
 let protectedIndex = 0;
 
 // Protect markdown images ![alt](url) first - most specific
 text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match) => {
 protectedElements.push(match);
 return `__PROTECTED_IMAGE_${protectedIndex++}__`;
 });
 
 // Protect markdown links [text](url)
 text = text.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match) => {
 protectedElements.push(match);
 return `__PROTECTED_LINK_${protectedIndex++}__`;
 });
 
 // Protect inline code `code`
 text = text.replace(/`[^`]+`/g, (match) => {
 protectedElements.push(match);
 return `__PROTECTED_CODE_${protectedIndex++}__`;
 });
 
 // Now apply normalization to the remaining text
 text = text
 // Replace multiple spaces with single space (preserve at line start)
 .replace(/(\S)[ \t]+/g, '$1 ')
 // Replace multiple newlines with max 2
 .replace(/\n{3,}/g, '\n\n')
 // Remove spaces before punctuation (but only after words)
 .replace(/(\w) +([.,;!?])/g, '$1$2')
 // Ensure space after punctuation (except at end)
 .replace(/([.,;!?])(?=[A-Za-z])/g, '$1 ')
 // Trim each line (but preserve indentation for lists)
 .split('\n')
 .map(line => {
   // Preserve leading spaces for list items
   if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
     // Only trim the end, keep leading spaces
     return line.replace(/\s+$/, '');
   }
   return line.trim();
 })
 .join('\n');
 
 // Restore protected elements
 text = text.replace(/__PROTECTED_(LINK|IMAGE|CODE)_(\d+)__/g, (_, _type, index) => {
 return protectedElements[parseInt(index, 10)] || '';
 });
 
 // Final trim (but preserve list indentation at start)
 if (text.match(/^\s*[-*+\d]/)) {
   // If starts with list item, only trim end
   return text.replace(/\s+$/, '');
 }
 return text.trim();
}

/**
 * Remove control characters and normalize unicode
 */
export function normalizeUnicode(text: string): string {
 return text
 // Remove zero-width characters (including soft hyphen)
 // Using individual replacements to avoid misleading character class
 .replace(/\u200B/g, '') // Zero-width space
 .replace(/\u200C/g, '') // Zero-width non-joiner
 .replace(/\u200D/g, '') // Zero-width joiner
 .replace(/\uFEFF/g, '') // Zero-width no-break space
 // Remove other control characters (keep newlines and tabs)
 // eslint-disable-next-line no-control-regex
 .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
 // Normalize quotes
 .replace(/[""]/g, '"')
 .replace(/['']/g, "'")
 // Normalize dashes
 .replace(/[‐‑‒–—―]/g, '-')
 // Normalize ellipsis
 .replace(/…/g, '...')
 // Normalize spaces
 .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
}

/**
 * Fix common text issues
 */
export function fixCommonIssues(text: string): string {
 return text
 // Fix missing spaces after sentences
 .replace(/([.!?])([A-Z])/g, '$1 $2')
 // Fix multiple punctuation (but preserve ellipsis)
 .replace(/\.{4,}/g, '...') // Normalize excessive dots to ellipsis
 .replace(/!{2,}/g, '!') // Remove duplicate !
 .replace(/\?{2,}/g, '?') // Remove duplicate ?
 // Fix spaces around quotes
 .replace(/" +(?=\w)/g, '"') // Remove space after opening quote
 .replace(/(?<=\w) +"/g, '"') // Remove space before closing quote  
 .replace(/(\w)"(\w)/g, '$1" $2') // Add space after closing quote when needed
 // Fix parentheses spacing
 .replace(/\( +/g, '(')
 .replace(/ +\)/g, ')')
 // Remove trailing spaces and tabs from lines
 .replace(/[ \t]+$/gm, '');
}