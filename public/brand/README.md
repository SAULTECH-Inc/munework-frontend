# Mune Work brand assets

Generated from the mark in `public/icon.svg` — purple gradient tile
(`#7C3AED` → `#C033F0`, 135°) holding five white rising bars whose tops trace
an M. The outer two are wider and tallest so they read as the letter's stems;
the inner three dip to carve the V between them.

The mark replaced a plain Outfit "M" for two reasons. Google's OAuth branding
review rejected the letter tile as not uniquely identifying the brand, and
setting the glyph as live text meant any platform lacking Outfit substituted a
different letterform. The bars are vector rects, so they rasterize identically
everywhere.

The wordmark exports still use Outfit for the "Mune Work" text, so **upload
these PNGs, not the SVG**, to any third party.

## Which file goes where

| Platform / use | File |
|---|---|
| **Google OAuth consent screen** (120×120 required) | `logo-mark-120.png` |
| Google, if the form rejects transparency | `logo-mark-square-120.png` |
| LinkedIn / X / company profile avatars | `logo-mark-400.png` |
| Anything that crops to a circle | `logo-mark-circle-512.png` |
| App store / high-res submissions | `logo-mark-1024.png` |
| Apple touch icon | `logo-mark-180.png` |
| PWA manifest icons | `logo-mark-192.png`, `logo-mark-512.png` |
| PWA maskable icon (Android) | `logo-maskable-512.png` |
| Browser favicon | `favicon-16.png`, `favicon-32.png`, `favicon-48.png` |
| Email headers, docs, light backgrounds | `logo-wordmark-dark-text.png` |
| Dark backgrounds, slide decks | `logo-wordmark-white-text.png` |
| Open Graph / link previews | `og-image-1200x630.png` |

`logo-maskable-512.png` runs the gradient full-bleed and shrinks the glyph into
the inner 80%, because Android crops maskable icons to an arbitrary shape — the
standard rounded tile would lose its corners.

## Regenerating

```
node scripts/brandgen.cjs public/brand
```

Drives Chrome's headless `--screenshot` so the Outfit webfont loads for the
wordmarks. Each size is rendered at its true pixel dimensions rather than
downscaled from one large export, which keeps the small favicons legible.

## Colours

| Token | Hex | HSL |
|---|---|---|
| Brand start | `#7C3AED` | `hsl(262 83% 58%)` |
| Brand end | `#C033F0` | `hsl(285 86% 57%)` |
| Ink (wordmark on light) | `#0F1020` | — |
