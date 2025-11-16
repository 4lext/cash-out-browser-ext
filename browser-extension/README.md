# Cash Out Markdown Copier Extension

This Manifest V3 browser extension adds a context menu action that converts the current
page to Markdown using the high-performance [`cash-out`](../README.md) library.
The converted Markdown is copied to the clipboard and a toast notification confirms
that it's ready to paste anywhere.

## Development

```bash
cd browser-extension
npm install
npm run build
```

The compiled extension will be emitted to `browser-extension/dist`. Load that folder as an
unpacked extension in Chromium-based browsers.
