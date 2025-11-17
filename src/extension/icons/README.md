# Extension Icons

This directory contains the icons for the Cash Out browser extension.

## Icon Sizes

- **icon-16.png**: 16x16px - Used in the browser toolbar and context menus
- **icon-48.png**: 48x48px - Used in the extension management page
- **icon-128.png**: 128x128px - Used in the Chrome Web Store and installation dialog

## Generating Icons

To generate PNG icons from the SVG source:

```bash
# Using ImageMagick
convert -background none icon.svg -resize 16x16 icon-16.png
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 128x128 icon-128.png

# Using Inkscape
inkscape icon.svg --export-type=png --export-filename=icon-16.png --export-width=16
inkscape icon.svg --export-type=png --export-filename=icon-48.png --export-width=48
inkscape icon.svg --export-type=png --export-filename=icon-128.png --export-width=128
```

## Design

The icon features:
- A gradient background (purple to violet)
- A document/page symbol representing HTML
- Markdown indicators (# symbol and lines)
- Clean, modern design that works at all sizes
