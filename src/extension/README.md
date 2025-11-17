# Cash Out Browser Extension

Convert web pages and selections to clean, formatted Markdown with a simple click.

## Features

- **Convert Selection**: Select any text on a webpage and convert it to Markdown
- **Convert Page**: Convert an entire webpage to Markdown
- **Context Menu**: Right-click on selected text or anywhere on the page to convert
- **Keyboard Shortcut**: Press `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac) to convert selection
- **Clipboard Integration**: Converted Markdown is automatically copied to your clipboard
- **Clean Output**: Removes scripts, styles, and other non-content elements

## Building the Extension

Build for both Chrome and Firefox:

```bash
bun run build:extension
```

Build and get confirmation for a specific browser:

```bash
bun run build:extension:chrome   # For Chrome/Edge
bun run build:extension:firefox  # For Firefox
```

The build output will be in:
- `dist/chrome/` - Chrome/Edge extension
- `dist/firefox/` - Firefox extension

## Loading the Extension

### Chrome / Edge

1. Navigate to `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `dist/chrome` directory
5. The extension is now installed!

### Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Navigate to the `dist/firefox` directory
4. Select the `manifest.json` file
5. The extension is now installed!

**Note**: In Firefox, temporary extensions are removed when Firefox closes. For persistent installation during development, use [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/).

## Usage

### Via Popup

1. Click the Cash Out icon in your browser toolbar
2. Choose "Convert Selection" or "Convert Entire Page"
3. The Markdown will be copied to your clipboard

### Via Context Menu

1. Right-click on selected text or anywhere on the page
2. Choose "Convert to Markdown" or "Convert Page to Markdown"
3. The Markdown will be copied to your clipboard

### Via Keyboard Shortcut

1. Select text on any webpage
2. Press `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac)
3. The selection will be converted and copied to your clipboard

## Options

The extension popup provides several options:

- **Include metadata**: Include page title, URL, and other metadata in the output
- **Preserve whitespace**: Keep original whitespace formatting
- **Auto-convert on selection**: Automatically convert when you select text (coming soon)

## Architecture

### Source Structure

```
src/extension/
├── manifest.chrome.json     # Chrome/Edge manifest (MV3)
├── manifest.firefox.json    # Firefox manifest (MV3 with Firefox-specific settings)
├── background.ts           # Service worker (handles extension lifecycle)
├── content.ts              # Content script (runs on web pages)
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styles
│   └── popup.ts           # Popup logic
└── icons/                  # Extension icons
    ├── icon.svg           # Source icon
    ├── icon-16.svg        # 16x16 placeholder
    ├── icon-48.svg        # 48x48 placeholder
    └── icon-128.svg       # 128x128 placeholder
```

### Build Output

```
dist/
├── chrome/                 # Chrome/Edge build
│   ├── manifest.json
│   ├── background.js       # Compiled background script
│   ├── content.js          # Compiled content script
│   ├── lib-browser.js      # Core conversion library
│   ├── worker.js           # Web Worker for processing
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── icons/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
└── firefox/                # Firefox build (same structure)
```

## Chrome vs Firefox Differences

The extension uses Manifest V3 for both browsers, with minor differences:

### Manifest Differences

**Chrome** (`manifest.chrome.json`):
```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

**Firefox** (`manifest.firefox.json`):
```json
{
  "background": {
    "scripts": ["background.js"],
    "type": "module"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "cash-out@example.com",
      "strict_min_version": "109.0"
    }
  }
}
```

### API Compatibility

The extension uses the `browser` namespace (Firefox standard) with fallback to `chrome` namespace:

```typescript
const browser = globalThis.browser || globalThis.chrome;
```

This works in both browsers:
- Firefox natively supports the `browser` namespace with Promises
- Chrome uses the `chrome` namespace (with callbacks converted to Promises by our code)

## Development

### Watch Mode

Currently, watch mode is not available for extension development. After making changes:

```bash
bun run build:extension
```

Then reload the extension in your browser:
- **Chrome**: Go to `chrome://extensions` and click the reload icon
- **Firefox**: Go to `about:debugging` and click "Reload"

### Debugging

**Chrome DevTools**:
- Right-click on the extension icon → "Inspect popup"
- Background script: Go to `chrome://extensions` → Click "Inspect views: service worker"
- Content script: Open DevTools on any page, logs appear in the console

**Firefox DevTools**:
- Click on the extension icon → Right-click popup → "Inspect"
- Background script: `about:debugging` → Click "Inspect" next to your extension
- Content script: Open DevTools on any page, logs appear in the console

## Icons

The current build uses SVG placeholders for icons. For production:

1. Generate proper PNG files from the SVG source:
   ```bash
   bun run build:icons
   ```

2. Or manually convert using ImageMagick:
   ```bash
   cd src/extension/icons
   convert -background none icon.svg -resize 16x16 icon-16.png
   convert -background none icon.svg -resize 48x48 icon-48.png
   convert -background none icon.svg -resize 128x128 icon-128.png
   ```

## Publishing

### Chrome Web Store

1. Generate PNG icons (see above)
2. Build the extension: `bun run build:extension:chrome`
3. Create a ZIP file of the `dist/chrome` directory
4. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Firefox Add-ons

1. Generate PNG icons
2. Build the extension: `bun run build:extension:firefox`
3. Create a ZIP file of the `dist/firefox` directory
4. Submit to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)

Alternatively, use [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/):

```bash
cd dist/firefox
npx web-ext build
npx web-ext sign --api-key=YOUR_API_KEY --api-secret=YOUR_API_SECRET
```

## License

MIT - See LICENSE file for details
