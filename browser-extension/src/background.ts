const MENU_ID = 'cash-out-context-menu';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Copy page as Markdown',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
  if (info.menuItemId !== MENU_ID || typeof tab?.id !== 'number') {
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: 'cash-out:start' }, () => {
    // Ignore errors that occur if the content script is unavailable.
    void chrome.runtime.lastError;
  });
});
