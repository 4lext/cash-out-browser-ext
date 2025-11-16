import './public-path';
import { convertToMarkdown } from 'cash-out/server';

const START_TYPE = 'cash-out:start';

let isConverting = false;

chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message?.type === START_TYPE && !isConverting) {
    void handleConversionRequest();
  }
});

async function handleConversionRequest(): Promise<void> {
  isConverting = true;
  showToast('Converting page to Markdown…');

  try {
    const html = document.documentElement?.outerHTML ?? '';
    const result = await convertToMarkdown(html);

    if (typeof result?.markdown !== 'string') {
      throw new Error('Conversion failed');
    }

    await navigator.clipboard.writeText(result.markdown);
    showToast('Markdown copied to clipboard.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(`Unable to copy Markdown: ${message}`, true);
  } finally {
    isConverting = false;
  }
}

function showToast(text: string, isError = false): void {
  const toast = document.createElement('div');
  toast.textContent = text;
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.padding = '12px 16px';
  toast.style.borderRadius = '8px';
  toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  toast.style.fontSize = '14px';
  toast.style.color = '#fff';
  toast.style.background = isError ? '#d93025' : '#1a73e8';
  toast.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.3)';
  toast.style.zIndex = '2147483647';
  toast.style.opacity = '1';
  toast.style.transition = 'opacity 300ms ease';

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 2000);
}
