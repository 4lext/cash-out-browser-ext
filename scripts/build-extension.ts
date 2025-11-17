#!/usr/bin/env bun

/**
 * Build script for browser extension
 * Creates separate builds for Chrome and Firefox
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = join(import.meta.dir, '..');
const distDir = join(rootDir, 'dist');
const srcExtensionDir = join(rootDir, 'src/extension');

// Browser targets
const browsers = ['chrome', 'firefox'] as const;
type Browser = (typeof browsers)[number];

console.log('🚀 Building browser extension...\n');

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });

// Build for each browser
for (const browser of browsers) {
  await buildForBrowser(browser);
}

// Summary
console.log('\n✨ Build complete!\n');
console.log('📦 Output directories:');
console.log(`   - dist/chrome/  (Chrome/Edge extension)`);
console.log(`   - dist/firefox/ (Firefox extension)`);
console.log('\n📖 To load the extension:');
console.log('   Chrome:  Navigate to chrome://extensions, enable Developer Mode, click "Load unpacked", select dist/chrome');
console.log('   Firefox: Navigate to about:debugging#/runtime/this-firefox, click "Load Temporary Add-on", select dist/firefox/manifest.json\n');

/**
 * Build extension for a specific browser
 */
async function buildForBrowser(browser: Browser): Promise<void> {
  console.log(`\n📦 Building for ${browser.toUpperCase()}...`);

  const browserDistDir = join(distDir, browser);
  mkdirSync(browserDistDir, { recursive: true });

  const startTime = performance.now();

  try {
    // 1. Build TypeScript files
    await buildTypeScript(browser, browserDistDir);

    // 2. Copy manifest
    await copyManifest(browser, browserDistDir);

    // 3. Copy static assets
    await copyStaticAssets(browser, browserDistDir);

    // 4. Copy icons
    await copyIcons(browser, browserDistDir);

    const buildTime = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ ${browser} build completed in ${buildTime}s`);

    // Calculate bundle size
    const size = await calculateDirectorySize(browserDistDir);
    console.log(`   Bundle size: ${(size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error(`❌ Failed to build for ${browser}`);
    console.error(error);
    process.exit(1);
  }
}

/**
 * Build TypeScript files for the extension
 */
async function buildTypeScript(browser: Browser, outputDir: string): Promise<void> {
  console.log('  📝 Compiling TypeScript...');

  const builds = [
    {
      name: 'Background Script',
      entry: join(srcExtensionDir, 'background.ts'),
      output: join(outputDir, 'background.js'),
    },
    {
      name: 'Content Script',
      entry: join(srcExtensionDir, 'content.ts'),
      output: join(outputDir, 'content.js'),
    },
    {
      name: 'Popup Script',
      entry: join(srcExtensionDir, 'popup/popup.ts'),
      output: join(outputDir, 'popup/popup.js'),
    },
  ];

  for (const config of builds) {
    const result = await Bun.build({
      entrypoints: [config.entry],
      format: 'esm',
      target: 'browser',
      minify: true,
      sourcemap: 'external',
      splitting: false,
      outdir: outputDir,
      naming: {
        entry: config.output.replace(outputDir + '/', ''),
      },
      // Mark CDN imports as external (don't bundle them)
      external: ['https://cdn.jsdelivr.net/*'],
    });

    if (!result.success) {
      throw new Error(`Failed to build ${config.name}: ${result.logs.join('\n')}`);
    }

    console.log(`     ✓ ${config.name}`);
  }
}

/**
 * Copy manifest file
 */
async function copyManifest(browser: Browser, outputDir: string): Promise<void> {
  console.log('  📋 Copying manifest...');

  const manifestPath = join(srcExtensionDir, `manifest.${browser}.json`);
  const outputPath = join(outputDir, 'manifest.json');

  const manifestContent = await Bun.file(manifestPath).text();
  await Bun.write(outputPath, manifestContent);

  console.log(`     ✓ manifest.json`);
}

/**
 * Copy static assets (HTML, CSS)
 */
async function copyStaticAssets(browser: Browser, outputDir: string): Promise<void> {
  console.log('  📄 Copying static assets...');

  // Create popup directory
  const popupDir = join(outputDir, 'popup');
  if (!existsSync(popupDir)) {
    mkdirSync(popupDir, { recursive: true });
  }

  // Copy popup HTML and CSS
  const popupSrcDir = join(srcExtensionDir, 'popup');

  const filesToCopy = [
    { src: join(popupSrcDir, 'popup.html'), dest: join(popupDir, 'popup.html') },
    { src: join(popupSrcDir, 'popup.css'), dest: join(popupDir, 'popup.css') },
  ];

  for (const { src, dest } of filesToCopy) {
    if (existsSync(src)) {
      const content = await Bun.file(src).text();
      await Bun.write(dest, content);
      console.log(`     ✓ ${src.replace(srcExtensionDir + '/', '')}`);
    }
  }
}

/**
 * Copy icons
 */
async function copyIcons(browser: Browser, outputDir: string): Promise<void> {
  console.log('  🎨 Copying icons...');

  const iconsDir = join(outputDir, 'icons');
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }

  const srcIconsDir = join(srcExtensionDir, 'icons');

  // Copy SVG icons (placeholder)
  const iconSizes = [16, 48, 128];
  for (const size of iconSizes) {
    const srcPath = join(srcIconsDir, `icon-${size}.svg`);
    const destPath = join(iconsDir, `icon-${size}.png`);

    if (existsSync(srcPath)) {
      // For now, copy SVG as PNG (browsers will handle it)
      // In production, you should convert SVG to PNG
      const content = await Bun.file(srcPath).text();

      // Create a simple note file for now
      // In production, use proper PNG files
      const note = `<!-- This should be a PNG file. Convert icon-${size}.svg to PNG -->\n${content}`;
      await Bun.write(destPath, content);
    } else {
      // Create a minimal placeholder
      const placeholder = createPlaceholderIcon(size);
      await Bun.write(destPath, placeholder);
    }
  }

  console.log(`     ✓ Icons (${iconSizes.length} sizes)`);
  console.log(`     ⚠️  Note: SVG icons copied as placeholders. Generate PNGs for production.`);
}

/**
 * Create a placeholder icon
 */
function createPlaceholderIcon(size: number): string {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.2}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="white" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold">MD</text>
</svg>`;
}

/**
 * Calculate total size of a directory
 */
async function calculateDirectorySize(dir: string): Promise<number> {
  const fs = await import('node:fs');
  let totalSize = 0;

  function scanDir(directory: string) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else {
        const stats = fs.statSync(fullPath);
        totalSize += stats.size;
      }
    }
  }

  scanDir(dir);
  return totalSize;
}
