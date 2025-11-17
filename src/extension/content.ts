/**
 * Content script for Cash Out extension
 * Runs on all web pages to enable HTML to Markdown conversion
 */

// Use browser namespace (works in both Chrome and Firefox)
const browser = globalThis.browser || globalThis.chrome;

interface MessageFromBackground {
  type: 'convert-selection' | 'convert-page';
}

/**
 * Get the HTML content to convert
 */
function getHTMLContent(type: 'selection' | 'page'): string {
  if (type === 'selection') {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      throw new Error('No text selected');
    }

    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    return container.innerHTML;
  } else {
    // Get the entire page content
    // Clone the body to avoid modifying the actual page
    const clone = document.body.cloneNode(true) as HTMLElement;

    // Remove script and style tags
    clone.querySelectorAll('script, style, noscript').forEach((el) => el.remove());

    return clone.innerHTML;
  }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Show a temporary notification
 */
function showNotification(message: string, type: 'success' | 'error' = 'success'): void {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;

  // Add animation keyframes
  if (!document.getElementById('cash-out-styles')) {
    const style = document.createElement('style');
    style.id = 'cash-out-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * Handle conversion request
 */
async function handleConversion(type: 'selection' | 'page'): Promise<void> {
  try {
    // Get HTML content
    const html = getHTMLContent(type);

    // Get user options from storage
    const storage = await browser.storage.local.get('options');
    const options = storage.options || {};

    // Send to background script for conversion
    const response = await browser.runtime.sendMessage({
      type: 'convert',
      html,
      options,
    });

    if (response.success && response.markdown) {
      // Copy to clipboard
      await copyToClipboard(response.markdown);

      // Show success notification
      showNotification(
        `✓ ${type === 'selection' ? 'Selection' : 'Page'} converted to Markdown and copied to clipboard!`
      );
    } else {
      throw new Error(response.error || 'Conversion failed');
    }
  } catch (error) {
    console.error('Conversion error:', error);
    showNotification(
      `✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error'
    );
  }
}

// Listen for messages from background script (context menu clicks)
browser.runtime.onMessage.addListener((message: MessageFromBackground) => {
  if (message.type === 'convert-selection') {
    handleConversion('selection');
  } else if (message.type === 'convert-page') {
    handleConversion('page');
  }
});

// Listen for keyboard shortcuts (can be added later)
document.addEventListener('keydown', (event) => {
  // Ctrl+Shift+M or Cmd+Shift+M to convert selection
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'M') {
    event.preventDefault();
    handleConversion('selection');
  }
});

console.log('Cash Out content script loaded');
