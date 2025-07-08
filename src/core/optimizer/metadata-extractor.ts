/**
 * Extract metadata from HTML documents
 */

import type { DocumentLike } from '@/types/dom.js';

/**
 * Extract all available metadata from document
 */
export function extractMetadata(doc: DocumentLike): {
  title?: string;
  description?: string;
  author?: string;
  publishDate?: string;
  language?: string;
} {
  const metadata: ReturnType<typeof extractMetadata> = {};

  // Extract title
  const title = extractTitle(doc);
  if (title) metadata.title = title;
  
  // Extract meta description
  const description = extractDescription(doc);
  if (description) metadata.description = description;
  
  // Extract author
  const author = extractAuthor(doc);
  if (author) metadata.author = author;
  
  // Extract publish date
  const publishDate = extractPublishDate(doc);
  if (publishDate) metadata.publishDate = publishDate;
  
  // Extract language
  const language = extractLanguage(doc);
  if (language) metadata.language = language;

  return metadata;
}

/**
 * Extract title from various sources
 */
function extractTitle(doc: DocumentLike): string | undefined {
  // Try <title> tag first
  const titleTag = doc.querySelector('title');
  if (titleTag?.textContent?.trim()) {
    return titleTag.textContent.trim();
  }

  // Try Open Graph title
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  if (ogTitle?.getAttribute('content')?.trim()) {
    return ogTitle.getAttribute('content')!.trim();
  }

  // Try Twitter title
  const twitterTitle = doc.querySelector('meta[name="twitter:title"]');
  if (twitterTitle?.getAttribute('content')?.trim()) {
    return twitterTitle.getAttribute('content')!.trim();
  }

  // Try first h1
  const h1 = doc.querySelector('h1');
  if (h1?.textContent?.trim()) {
    return h1.textContent.trim();
  }

  return undefined;
}

/**
 * Extract description
 */
function extractDescription(doc: DocumentLike): string | undefined {
  // Try meta description
  const metaDesc = doc.querySelector('meta[name="description"]');
  if (metaDesc?.getAttribute('content')?.trim()) {
    return metaDesc.getAttribute('content')!.trim();
  }

  // Try Open Graph description
  const ogDesc = doc.querySelector('meta[property="og:description"]');
  if (ogDesc?.getAttribute('content')?.trim()) {
    return ogDesc.getAttribute('content')!.trim();
  }

  // Try Twitter description
  const twitterDesc = doc.querySelector('meta[name="twitter:description"]');
  if (twitterDesc?.getAttribute('content')?.trim()) {
    return twitterDesc.getAttribute('content')!.trim();
  }

  return undefined;
}

/**
 * Extract author information
 */
function extractAuthor(doc: DocumentLike): string | undefined {
  // Try meta author
  const metaAuthor = doc.querySelector('meta[name="author"]');
  if (metaAuthor?.getAttribute('content')?.trim()) {
    return metaAuthor.getAttribute('content')!.trim();
  }

  // Try Open Graph article:author
  const ogAuthor = doc.querySelector('meta[property="article:author"]');
  if (ogAuthor?.getAttribute('content')?.trim()) {
    return ogAuthor.getAttribute('content')!.trim();
  }

  // Try schema.org author
  const schemaAuthor = doc.querySelector('[itemtype*="schema.org"] [itemprop="author"]');
  if (schemaAuthor?.textContent?.trim()) {
    return schemaAuthor.textContent.trim();
  }

  // Try byline patterns
  const bylinePatterns = [
    '.byline',
    '.author',
    '[class*="author"]',
    '[class*="byline"]',
    '[rel="author"]'
  ];

  for (const pattern of bylinePatterns) {
    const element = doc.querySelector(pattern);
    if (element?.textContent?.trim()) {
      // Clean up common patterns like "By John Doe"
      const text = element.textContent.trim();
      return text.replace(/^(by|written by|author:)\s*/i, '');
    }
  }

  return undefined;
}

/**
 * Extract publish date
 */
function extractPublishDate(doc: DocumentLike): string | undefined {
  // Try meta article:published_time
  const ogPublished = doc.querySelector('meta[property="article:published_time"]');
  if (ogPublished?.getAttribute('content')) {
    return normalizeDate(ogPublished.getAttribute('content')!);
  }

  // Try datePublished schema
  const schemaDate = doc.querySelector('[itemprop="datePublished"]');
  if (schemaDate?.getAttribute('datetime')) {
    return normalizeDate(schemaDate.getAttribute('datetime')!);
  } else if (schemaDate?.textContent?.trim()) {
    return normalizeDate(schemaDate.textContent.trim());
  }

  // Try time element
  const timeElement = doc.querySelector('time[datetime]');
  if (timeElement?.getAttribute('datetime')) {
    return normalizeDate(timeElement.getAttribute('datetime')!);
  }

  // Try common date patterns in classes
  const datePatterns = [
    '.publish-date',
    '.published-date',
    '.post-date',
    '[class*="publish"]',
    '[class*="date"]'
  ];

  for (const pattern of datePatterns) {
    const element = doc.querySelector(pattern);
    if (element?.textContent?.trim()) {
      const normalized = normalizeDate(element.textContent.trim());
      if (normalized) return normalized;
    }
  }

  return undefined;
}

/**
 * Extract language
 */
function extractLanguage(doc: DocumentLike): string | undefined {
  // Try html lang attribute
  const htmlLang = doc.documentElement.getAttribute('lang');
  if (htmlLang) {
    return htmlLang.split('-')[0]; // Return just the language code
  }

  // Try meta language
  const metaLang = doc.querySelector('meta[name="language"]');
  if (metaLang) {
    const content = metaLang.getAttribute('content');
    if (content) return content;
  }

  // Try Open Graph locale
  const ogLocale = doc.querySelector('meta[property="og:locale"]');
  if (ogLocale?.getAttribute('content')) {
    return ogLocale.getAttribute('content')!.split('_')[0];
  }

  return undefined;
}

/**
 * Normalize date string to ISO format
 */
function normalizeDate(dateStr: string): string | undefined {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // If parsing fails, try to extract date patterns
    const patterns = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } catch {
          // Continue to next pattern
        }
      }
    }
  }

  return undefined;
}

/**
 * Calculate reading time based on word count
 */
export function calculateReadingTime(wordCount: number, wordsPerMinute: number = 200): number {
  return Math.ceil(wordCount / wordsPerMinute);
}