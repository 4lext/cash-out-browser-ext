/**
 * Background service worker for Cash Out extension
 * Handles extension lifecycle and message passing
 */

// Import the conversion library from CDN
import { convertToMarkdown } from 'https://cdn.jsdelivr.net/npm/cash-out@latest/dist/browser.js';

// Use browser namespace (works in both Chrome and Firefox with polyfill)
const browser = globalThis.browser || globalThis.chrome;

interface ConversionMessage {
  type: 'convert';
  html: string;
  options?: {
    includeMetadata?: boolean;
    preserveWhitespace?: boolean;
  };
}

interface ConversionResponse {
  success: boolean;
  markdown?: string;
  error?: string;
}

// Extension installation handler
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Cash Out extension installed');

    // Set default options
    browser.storage.local.set({
      options: {
        includeMetadata: true,
        preserveWhitespace: false,
        autoConvertSelection: false,
      },
    });
  } else if (details.reason === 'update') {
    console.log('Cash Out extension updated to', browser.runtime.getManifest().version);
  }
});

// Message handler for content scripts and popup
browser.runtime.onMessage.addListener(
  (
    message: ConversionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ConversionResponse) => void
  ) => {
    // Handle conversion requests
    if (message.type === 'convert') {
      handleConversion(message, sender)
        .then((markdown) => {
          sendResponse({ success: true, markdown });
        })
        .catch((error) => {
          console.error('Conversion error:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });

      // Return true to indicate async response
      return true;
    }

    return false;
  }
);

/**
 * Handle HTML to Markdown conversion
 */
async function handleConversion(
  message: ConversionMessage,
  sender: chrome.runtime.MessageSender
): Promise<string> {
  try {
    const markdown = await convertToMarkdown(message.html, {
      includeMetadata: message.options?.includeMetadata ?? true,
      preserveWhitespace: message.options?.preserveWhitespace ?? false,
    });

    return markdown;
  } catch (error) {
    console.error('Error converting HTML to Markdown:', error);
    throw error;
  }
}

// Context menu setup (optional - can be added later)
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus?.create({
    id: 'convert-selection',
    title: 'Convert to Markdown',
    contexts: ['selection'],
  });

  browser.contextMenus?.create({
    id: 'convert-page',
    title: 'Convert Page to Markdown',
    contexts: ['page'],
  });
});

// Context menu click handler
browser.contextMenus?.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === 'convert-selection' || info.menuItemId === 'convert-page') {
    // Send message to content script to handle conversion
    browser.tabs.sendMessage(tab.id, {
      type: info.menuItemId,
    });
  }
});

console.log('Cash Out background service worker initialized');
