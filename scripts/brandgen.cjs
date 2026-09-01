/**
 * Renders the Mune Work brand assets at every size the platforms we upload to
 * require.
 *
 * Drives Chrome's headless --screenshot directly rather than Playwright, which
 * is not installed here. --default-background-color=00000000 gives a
 * transparent canvas; --virtual-time-budget lets the Outfit webfont load before
 * the wordmark is captured.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const TMP = '/tmp/brand-html';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const VIOLET = '#7C3AED';
const FUCHSIA = '#C033F0';
const INK = '#0F1020';

/**
 * Five rising bars whose tops trace an M. `inset` shrinks the tile inside the
 * canvas for maskable icons; `glyphScale` shrinks the bars within the tile.
 */
function markSvg(size, radiusPct, glyphScale = 1) {
  // Bar geometry in the 64-unit design grid: x, y, height, width.
  //
  // The outer two are wider and tallest so they read as the M's stems, and the
  // inner three dip sharply to carve the V between them. With uniform widths
  // and a shallow dip the mark just looks like a generic bar chart.
  const bars = [
    [11, 15, 38, 8],
    [22, 31, 22, 5],
    [29.5, 39, 14, 5],
    [37, 26, 27, 5],
    [45, 11, 42, 8],
  ];

  // Scaling the glyph means scaling about the tile centre (32,32).
  const g = bars
    .map(([x, y, h, bw]) => {
      const sx = 32 + (x - 32) * glyphScale;
      const sy = 32 + (y - 32) * glyphScale;
      const w = bw * glyphScale;
      const sh = h * glyphScale;
      const r = (bw / 2) * glyphScale;
      return `<rect x="${sx}" y="${sy}" width="${w}" height="${sh}" rx="${r}"/>`;
    })
    .join('');

  const rx = (64 * parseFloat(radiusPct)) / 100;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
    <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${VIOLET}"/><stop offset="100%" stop-color="${FUCHSIA}"/>
    </linearGradient></defs>
    <rect width="64" height="64" rx="${rx}" fill="url(#b)"/>
    <g fill="#fff">${g}</g>
  </svg>`;
}

const FONTS = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">`;

function page(body, width, height, bg) {
  return `<!doctype html><meta charset="utf-8">${FONTS}<style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${width}px;height:${height}px;overflow:hidden}
    body{font-family:Outfit,system-ui,sans-serif;-webkit-font-smoothing:antialiased;
         background:${bg};display:grid;place-items:center}
  </style>${body}`;
}

function wordmark(size, color) {
  return `<div style="display:flex;align-items:center;gap:${size * 0.28}px">
    ${markSvg(size, '25')}
    <span style="font-size:${size * 0.62}px;font-weight:700;color:${color};
      letter-spacing:-0.03em;white-space:nowrap">Mune Work</span>
  </div>`;
}

const JOBS = [
  ...[120, 180, 192, 256, 400, 512, 1024].map((s) => ({
    name: `logo-mark-${s}.png`, w: s, h: s, html: markSvg(s, '25'),
  })),
  ...[120, 512].map((s) => ({
    name: `logo-mark-square-${s}.png`, w: s, h: s, html: markSvg(s, '0'),
  })),
  { name: 'logo-mark-circle-512.png', w: 512, h: 512, html: markSvg(512, '50') },
  // Android crops maskable icons hard, so the tile runs full-bleed and the
  // bars sit inside the 80% safe zone.
  { name: 'logo-maskable-512.png', w: 512, h: 512, html: markSvg(512, '0', 0.7) },
  ...[16, 32, 48].map((s) => ({
    name: `favicon-${s}.png`, w: s, h: s, html: markSvg(s, '22'),
  })),
  { name: 'logo-wordmark-dark-text.png', w: 900, h: 220, html: wordmark(120, INK) },
  { name: 'logo-wordmark-white-text.png', w: 900, h: 220, html: wordmark(120, '#FFFFFF') },
  {
    name: 'og-image-1200x630.png', w: 1200, h: 630,
    bg: `linear-gradient(135deg, ${INK} 0%, #1A1035 55%, #2A1150 100%)`,
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:34px">
        ${wordmark(132, '#FFFFFF')}
        <p style="font-size:34px;color:#C9C6E0">Find work that fits. Hire people who fit.</p>
      </div>`,
  },
];

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

for (const job of JOBS) {
  const htmlPath = path.join(TMP, job.name.replace(/\.png$/, '.html'));
  fs.writeFileSync(htmlPath, page(job.html, job.w, job.h, job.bg ?? 'transparent'));

  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    '--virtual-time-budget=6000',
    `--window-size=${job.w},${job.h}`,
    `--screenshot=${path.join(OUT, job.name)}`,
    `file://${htmlPath}`,
  ], { stdio: 'ignore' });

  console.log(`  ${job.name}  ${job.w}x${job.h}`);
}
