# Mune Work brand assets

Generated from the mark in `public/icon.svg` — purple gradient tile
(`#7C3AED` → `#C033F0`, 135°) with a white Outfit "M".

The source SVG sets the "M" as live text, so anything that rasterizes it
without the Outfit webfont substitutes a different typeface and the logo
changes shape. These PNGs have the real font baked in — **upload these, not
the SVG**, to any third party.

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
node /tmp/brandgen.js <output-dir>
```

Renders through headless Chrome so the Outfit webfont loads. Each size is
rendered at its true pixel dimensions rather than downscaled from one large
export, which keeps the small favicons legible.

## Colours

| Token | Hex | HSL |
|---|---|---|
| Brand start | `#7C3AED` | `hsl(262 83% 58%)` |
| Brand end | `#C033F0` | `hsl(285 86% 57%)` |
| Ink (wordmark on light) | `#0F1020` | — |
