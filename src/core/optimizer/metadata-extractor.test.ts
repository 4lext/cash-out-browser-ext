import { describe, expect, it } from 'bun:test';

import { extractMetadata, calculateReadingTime } from './metadata-extractor.js';

// Mock DocumentLike interface
interface MockDocumentLike {
  documentElement: { getAttribute: (name: string) => string | null };
  querySelector: (selector: string) => MockElement | null;
}

interface MockElement {
  textContent?: string | null;
  getAttribute: (name: string) => string | null;
}

describe('Metadata Extractor', () => {
  describe('extractMetadata', () => {
    it('should extract basic metadata from title tag', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'title') {
            return { textContent: 'Test Title', getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.title).toBe('Test Title');
    });

    it('should return empty object when no metadata found', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: () => null
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata).toEqual({});
    });

    it('should extract complete metadata set', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: (name: string) => name === 'lang' ? 'en-US' : null },
        querySelector: (selector: string) => {
          const selectors: Record<string, MockElement> = {
            'title': { textContent: 'Complete Title', getAttribute: () => null },
            'meta[name="description"]': { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'Test description' : null 
            },
            'meta[name="author"]': { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'John Doe' : null 
            },
            'meta[property="article:published_time"]': { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? '2024-01-01T00:00:00Z' : null 
            }
          };
          return selectors[selector] || null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata).toEqual({
        title: 'Complete Title',
        description: 'Test description',
        author: 'John Doe',
        publishDate: '2024-01-01T00:00:00.000Z',
        language: 'en'
      });
    });
  });

  describe('Title Extraction', () => {
    it('should extract title from title tag', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'title') {
            return { textContent: 'Page Title', getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.title).toBe('Page Title');
    });

    it('should fallback to Open Graph title', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[property="og:title"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'OG Title' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.title).toBe('OG Title');
    });

    it('should fallback to Twitter title', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[name="twitter:title"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'Twitter Title' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.title).toBe('Twitter Title');
    });

    it('should fallback to h1 element', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'h1') {
            return { textContent: 'H1 Title', getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.title).toBe('H1 Title');
    });

    it('should trim whitespace from titles', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'title') {
            return { textContent: '  Whitespace Title  ', getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.title).toBe('Whitespace Title');
    });

    it('should ignore empty titles', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'title') {
            return { textContent: '   ', getAttribute: () => null };
          }
          if (selector === 'h1') {
            return { textContent: 'Fallback H1', getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.title).toBe('Fallback H1');
    });
  });

  describe('Description Extraction', () => {
    it('should extract description from meta tag', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[name="description"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'Meta description' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.description).toBe('Meta description');
    });

    it('should fallback to Open Graph description', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[property="og:description"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'OG description' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.description).toBe('OG description');
    });

    it('should fallback to Twitter description', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[name="twitter:description"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'Twitter description' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.description).toBe('Twitter description');
    });
  });

  describe('Author Extraction', () => {
    it('should extract author from meta tag', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[name="author"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'John Smith' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.author).toBe('John Smith');
    });

    it('should extract author from Open Graph article:author', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[property="article:author"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'Jane Doe' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.author).toBe('Jane Doe');
    });

    it('should extract author from schema.org markup', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === '[itemtype*="schema.org"] [itemprop="author"]') {
            return { textContent: 'Schema Author', getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.author).toBe('Schema Author');
    });

    it('should extract author from byline patterns', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === '.byline') {
            return { textContent: 'By Sarah Wilson', getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.author).toBe('Sarah Wilson');
    });

    it('should clean up byline prefixes', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === '.byline') {
            return { textContent: 'Written by Mike Johnson', getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.author).toBe('Mike Johnson');
    });

    it('should clean up author prefix case insensitively', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === '.byline') {
            return { textContent: 'AUTHOR: Bob Smith', getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.author).toBe('Bob Smith');
    });
  });

  describe('Publish Date Extraction', () => {
    it('should extract date from article:published_time', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[property="article:published_time"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? '2024-01-15T10:30:00Z' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.publishDate).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should extract date from schema.org datePublished', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === '[itemprop="datePublished"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'datetime' ? '2024-02-01' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.publishDate).toBe('2024-02-01T00:00:00.000Z');
    });

    it('should extract date from time element', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'time[datetime]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'datetime' ? '2024-03-15T14:30:00' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.publishDate).toBe('2024-03-15T14:30:00.000Z');
    });

    it('should handle invalid dates gracefully', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[property="article:published_time"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'invalid-date' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.publishDate).toBeUndefined();
    });

    it('should parse various date formats', () => {
      const testDates = [
        { input: '2024-01-01', expected: '2024-01-01T00:00:00.000Z' },
        { input: '01/15/2024', expected: '2024-01-15T00:00:00.000Z' },
        { input: 'January 1, 2024', expected: '2024-01-01T00:00:00.000Z' }
      ];

      for (const testDate of testDates) {
        const doc: MockDocumentLike = {
          documentElement: { getAttribute: () => null },
          querySelector: (selector: string) => {
            if (selector === 'meta[property="article:published_time"]') {
              return { 
                textContent: null, 
                getAttribute: (name: string) => name === 'content' ? testDate.input : null 
              };
            }
            return null;
          }
        };

        const metadata = extractMetadata(doc as any);
        expect(metadata.publishDate).toBe(testDate.expected);
      }
    });
  });

  describe('Language Extraction', () => {
    it('should extract language from html lang attribute', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: (name: string) => name === 'lang' ? 'en-US' : null },
        querySelector: () => null
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.language).toBe('en');
    });

    it('should extract language from meta tag', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[name="language"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'fr' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.language).toBe('fr');
    });

    it('should extract language from Open Graph locale', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[property="og:locale"]') {
            return { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'es_ES' : null 
            };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.language).toBe('es');
    });

    it('should handle complex language codes', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: (name: string) => name === 'lang' ? 'zh-Hans-CN' : null },
        querySelector: () => null
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.language).toBe('zh');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null textContent', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'title') {
            return { textContent: null, getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.title).toBeUndefined();
    });

    it('should handle null getAttribute responses', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          if (selector === 'meta[name="description"]') {
            return { textContent: null, getAttribute: () => null };
          }
          return null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.description).toBeUndefined();
    });

    it('should prioritize sources correctly', () => {
      const doc: MockDocumentLike = {
        documentElement: { getAttribute: () => null },
        querySelector: (selector: string) => {
          const selectors: Record<string, MockElement> = {
            'title': { textContent: 'Title Tag', getAttribute: () => null },
            'meta[property="og:title"]': { 
              textContent: null, 
              getAttribute: (name: string) => name === 'content' ? 'OG Title' : null 
            },
            'h1': { textContent: 'H1 Title', getAttribute: () => null }
          };
          return selectors[selector] || null;
        }
      };

      const metadata = extractMetadata(doc as any);
      expect(metadata.title).toBe('Title Tag'); // Should prefer title tag
    });
  });

  describe('calculateReadingTime', () => {
    it('should calculate reading time with default WPM', () => {
      expect(calculateReadingTime(200)).toBe(1);
      expect(calculateReadingTime(400)).toBe(2);
      expect(calculateReadingTime(150)).toBe(1); // Rounds up
    });

    it('should calculate reading time with custom WPM', () => {
      expect(calculateReadingTime(300, 100)).toBe(3);
      expect(calculateReadingTime(150, 100)).toBe(2); // Rounds up
    });

    it('should handle zero words', () => {
      expect(calculateReadingTime(0)).toBe(0);
    });

    it('should handle very large word counts', () => {
      expect(calculateReadingTime(100000)).toBe(500);
    });

    it('should always round up', () => {
      expect(calculateReadingTime(1, 200)).toBe(1);
      expect(calculateReadingTime(199, 200)).toBe(1);
      expect(calculateReadingTime(201, 200)).toBe(2);
    });
  });
});