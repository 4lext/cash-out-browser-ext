/**
 * Popup script for Cash Out extension
 * Handles user interactions in the extension popup
 */

// Use browser namespace (works in both Chrome and Firefox)
const browser = globalThis.browser || globalThis.chrome;

interface StorageOptions {
  includeMetadata: boolean;
  preserveWhitespace: boolean;
  autoConvertSelection: boolean;
}

/**
 * Show status message
 */
function showStatus(message: string, type: 'success' | 'error'): void {
  const status = document.getElementById('status');
  if (!status) return;

  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';

  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

/**
 * Get current tab
 */
async function getCurrentTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Load saved options
 */
async function loadOptions(): Promise<void> {
  try {
    const storage = await browser.storage.local.get('options');
    const options: StorageOptions = storage.options || {
      includeMetadata: true,
      preserveWhitespace: false,
      autoConvertSelection: false,
    };

    // Update checkboxes
    const includeMetadataEl = document.getElementById('include-metadata') as HTMLInputElement;
    const preserveWhitespaceEl = document.getElementById(
      'preserve-whitespace'
    ) as HTMLInputElement;
    const autoConvertEl = document.getElementById('auto-convert') as HTMLInputElement;

    if (includeMetadataEl) includeMetadataEl.checked = options.includeMetadata;
    if (preserveWhitespaceEl) preserveWhitespaceEl.checked = options.preserveWhitespace;
    if (autoConvertEl) autoConvertEl.checked = options.autoConvertSelection;
  } catch (error) {
    console.error('Error loading options:', error);
  }
}

/**
 * Save options
 */
async function saveOptions(): Promise<void> {
  try {
    const includeMetadataEl = document.getElementById('include-metadata') as HTMLInputElement;
    const preserveWhitespaceEl = document.getElementById(
      'preserve-whitespace'
    ) as HTMLInputElement;
    const autoConvertEl = document.getElementById('auto-convert') as HTMLInputElement;

    const options: StorageOptions = {
      includeMetadata: includeMetadataEl?.checked ?? true,
      preserveWhitespace: preserveWhitespaceEl?.checked ?? false,
      autoConvertSelection: autoConvertEl?.checked ?? false,
    };

    await browser.storage.local.set({ options });
  } catch (error) {
    console.error('Error saving options:', error);
  }
}

/**
 * Convert selection to Markdown
 */
async function convertSelection(): Promise<void> {
  try {
    const tab = await getCurrentTab();
    if (!tab?.id) {
      showStatus('No active tab found', 'error');
      return;
    }

    // Send message to content script
    await browser.tabs.sendMessage(tab.id, { type: 'convert-selection' });

    showStatus('Selection converted to Markdown!', 'success');
  } catch (error) {
    console.error('Error converting selection:', error);
    showStatus(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error'
    );
  }
}

/**
 * Convert entire page to Markdown
 */
async function convertPage(): Promise<void> {
  try {
    const tab = await getCurrentTab();
    if (!tab?.id) {
      showStatus('No active tab found', 'error');
      return;
    }

    // Send message to content script
    await browser.tabs.sendMessage(tab.id, { type: 'convert-page' });

    showStatus('Page converted to Markdown!', 'success');
  } catch (error) {
    console.error('Error converting page:', error);
    showStatus(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error'
    );
  }
}

/**
 * Initialize popup
 */
async function initialize(): Promise<void> {
  // Load saved options
  await loadOptions();

  // Set up event listeners
  const convertSelectionBtn = document.getElementById('convert-selection');
  const convertPageBtn = document.getElementById('convert-page');
  const includeMetadataEl = document.getElementById('include-metadata');
  const preserveWhitespaceEl = document.getElementById('preserve-whitespace');
  const autoConvertEl = document.getElementById('auto-convert');

  if (convertSelectionBtn) {
    convertSelectionBtn.addEventListener('click', convertSelection);
  }

  if (convertPageBtn) {
    convertPageBtn.addEventListener('click', convertPage);
  }

  // Save options when changed
  [includeMetadataEl, preserveWhitespaceEl, autoConvertEl].forEach((el) => {
    if (el) {
      el.addEventListener('change', saveOptions);
    }
  });

  // Options link (can be implemented later)
  const optionsLink = document.getElementById('options-link');
  if (optionsLink) {
    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open options page (can be implemented later)
      showStatus('Options page coming soon!', 'success');
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
