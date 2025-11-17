#!/usr/bin/env bun

/**
 * Generate PNG icons from SVG source
 * Creates icons in multiple sizes for the browser extension
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = join(import.meta.dir, '..');
const svgPath = join(rootDir, 'src/extension/icons/icon.svg');
const iconsDir = join(rootDir, 'src/extension/icons');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 48, 128];

console.log('📸 Generating extension icons...\n');

// Read the SVG content
const svgContent = await Bun.file(svgPath).text();

// For now, we'll create simple colored squares as placeholders
// In production, you'd want to use a proper SVG to PNG converter
// or provide pre-made PNG files

for (const size of sizes) {
  const outputPath = join(iconsDir, `icon-${size}.png`);

  // Create a simple PNG placeholder using canvas (if available in Bun)
  // For now, we'll just copy the SVG and note that PNGs should be generated
  console.log(`⚠️  Please convert icon.svg to icon-${size}.png (${size}x${size})`);
  console.log(`   Output: ${outputPath}`);
}

console.log('\n📝 Note: Icon generation requires a SVG-to-PNG converter.');
console.log('   You can use tools like:');
console.log('   - ImageMagick: convert -background none icon.svg -resize 128x128 icon-128.png');
console.log('   - Inkscape: inkscape icon.svg --export-type=png --export-width=128');
console.log('   - Online: https://cloudconvert.com/svg-to-png\n');

// Create a simple README in the icons directory
const readmePath = join(iconsDir, 'README.md');
const readme = `# Extension Icons

This directory contains the icons for the Cash Out browser extension.

## Icon Sizes

- **icon-16.png**: 16x16px - Used in the browser toolbar and context menus
- **icon-48.png**: 48x48px - Used in the extension management page
- **icon-128.png**: 128x128px - Used in the Chrome Web Store and installation dialog

## Generating Icons

To generate PNG icons from the SVG source:

\`\`\`bash
# Using ImageMagick
convert -background none icon.svg -resize 16x16 icon-16.png
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 128x128 icon-128.png

# Using Inkscape
inkscape icon.svg --export-type=png --export-filename=icon-16.png --export-width=16
inkscape icon.svg --export-type=png --export-filename=icon-48.png --export-width=48
inkscape icon.svg --export-type=png --export-filename=icon-128.png --export-width=128
\`\`\`

## Design

The icon features:
- A gradient background (purple to violet)
- A document/page symbol representing HTML
- Markdown indicators (# symbol and lines)
- Clean, modern design that works at all sizes
`;

await Bun.write(readmePath, readme);

console.log('✅ Created icons README');
console.log(`   Location: ${readmePath}\n`);

// For development purposes, create a simple fallback icon script
// This creates a basic colored square that can be used for testing

const createPlaceholderIcon = (size: number): string => {
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
};

// Create placeholder SVG files that can be used during development
for (const size of sizes) {
  const placeholderPath = join(iconsDir, `icon-${size}.svg`);
  const svg = createPlaceholderIcon(size);
  await Bun.write(placeholderPath, svg);
  console.log(`✅ Created placeholder: icon-${size}.svg`);
}

console.log('\n✨ Icon generation complete!');
console.log('   Placeholder SVG files created for development.');
console.log('   Please generate proper PNG files for production.\n');
