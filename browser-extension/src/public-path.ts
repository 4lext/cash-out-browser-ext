declare let __webpack_public_path__: string;

const baseUrl =
  typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function'
    ? chrome.runtime.getURL('/')
    : '/';

__webpack_public_path__ = baseUrl;
