/**
 * Efficient Markdown string builder with performance optimizations
 */

export class MarkdownBuilder {
  private chunks: string[] = [];
  private currentIndent = 0;
  private lastWasBlank = true;

  /**
   * Add text to the builder
   */
  add(text: string): this {
    if (text !== '') {  // Changed from if (text) to preserve whitespace-only strings
      this.chunks.push(text);
      this.lastWasBlank = false;
    }
    return this;
  }

  /**
   * Add text with automatic indentation
   */
  addLine(text: string = ''): this {
    if (text) {
      const indent = ' '.repeat(this.currentIndent);
      this.chunks.push(indent + text);
      this.lastWasBlank = false;
    }
    this.chunks.push('\n');
    return this;
  }

  /**
   * Add a blank line (max 2 consecutive)
   */
  addBlankLine(): this {
    if (!this.lastWasBlank) {
      this.chunks.push('\n');
      this.lastWasBlank = true;
    }
    return this;
  }

  /**
   * Increase indentation level
   */
  indent(spaces = 2): this {
    this.currentIndent += spaces;
    return this;
  }

  /**
   * Decrease indentation level
   */
  outdent(spaces = 2): this {
    this.currentIndent = Math.max(0, this.currentIndent - spaces);
    return this;
  }

  /**
   * Add ATX-style heading
   */
  addHeading(level: number, text: string): this {
    const hashes = '#'.repeat(Math.min(6, Math.max(1, level)));
    return this.addBlankLine().addLine(`${hashes} ${text}`).addBlankLine();
  }

  /**
   * Add paragraph with text wrapping
   */
  addParagraph(text: string): this {
    if (!text.trim()) return this;

    // Simple text wrapping at 80 characters
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > 80) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    for (const line of lines) {
      this.addLine(line);
    }

    return this.addBlankLine();
  }

  /**
   * Add code block with language
   */
  addCodeBlock(code: string, language?: string): this {
    return this.addBlankLine()
      .addLine('```' + (language || ''))
      .add(code)
      .addLine()
      .addLine('```')
      .addBlankLine();
  }

  /**
   * Add blockquote
   */
  addBlockquote(text: string): this {
    const lines = text.split('\n');
    for (const line of lines) {
      this.addLine(`> ${line}`);
    }
    return this.addBlankLine();
  }

  /**
   * Add list item
   */
  addListItem(text: string, ordered = false, number = 1): this {
    const marker = ordered ? `${number}.` : '-';
    const indent = ' '.repeat(this.currentIndent);
    const line = `${indent}${marker} ${text}`;
    // Don't use addLine as it adds its own indentation
    this.chunks.push(line);
    this.chunks.push('\n');
    this.lastWasBlank = false;
    return this;
  }

  /**
   * Build the final markdown string
   * @param normalize - Whether to apply normalization (default: true)
   */
  build(normalize = true): string {
    // Join all chunks
    let result = this.chunks.join('');

    if (normalize) {
      // Normalize line endings
      result = result.replace(/\r\n/g, '\n');

      // Remove trailing whitespace from lines
      result = result.replace(/[ \t]+$/gm, '');

      // Ensure no more than 2 consecutive blank lines
      result = result.replace(/\n{3,}/g, '\n\n');

      // Trim the result
      result = result.trim();
    }

    return result;
  }

  /**
   * Get current length (for monitoring)
   */
  get length(): number {
    return this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  }

  /**
   * Get current indentation level
   */
  get indentLevel(): number {
    return this.currentIndent;
  }
}
