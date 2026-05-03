/**
 * Generates all required PWA / mobile app icons from an inline SVG.
 * Run once: node scripts/gen-icons.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../public/icons');

/**
 * SVG icon: gold music note on dark background.
 * - Uses the app's gold (#D4AF37) and dark (#0A0A0A) theme colours.
 * - Designed with ~10% padding for maskable safe-zone compliance.
 */
function makeSvg(size) {
  const bg = '#0A0A0A';
  const gold = '#D4AF37';
  const accent = '#B8960E';

  // Scale notehead and stem proportionally
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
  <!-- Background -->
  <rect width="100" height="100" rx="20" fill="${bg}"/>

  <!-- Outer glow ring -->
  <circle cx="50" cy="50" r="38" fill="none" stroke="${gold}" stroke-width="2.5" opacity="0.35"/>

  <!-- Music note — single eighth note centred -->
  <!-- Note head (slightly tilted ellipse) -->
  <ellipse cx="44" cy="63" rx="9" ry="6.5" transform="rotate(-20,44,63)" fill="${gold}"/>
  <!-- Stem -->
  <rect x="52.2" y="28" width="3.2" height="36" rx="1.6" fill="${gold}"/>
  <!-- Flag -->
  <path d="M55.4 28 Q72 35 65 52" stroke="${gold}" stroke-width="3.2" fill="none" stroke-linecap="round"/>

  <!-- Small accent dot bottom-right of ring (decorative) -->
  <circle cx="72" cy="68" r="2.2" fill="${accent}" opacity="0.6"/>
</svg>`;
}

/**
 * Maskable variant: identical icon but with extra background padding so
 * Android's adaptive icon crop never clips the note.
 */
function makeMaskableSvg(size) {
  const bg = '#0A0A0A';
  const gold = '#D4AF37';
  const accent = '#B8960E';
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
  <!-- Full bleed background (no rounded corners — Android masks it) -->
  <rect width="100" height="100" fill="${bg}"/>

  <!-- Outer glow ring (safe zone: fits within inner 80%) -->
  <circle cx="50" cy="50" r="32" fill="none" stroke="${gold}" stroke-width="2.2" opacity="0.35"/>

  <!-- Note head -->
  <ellipse cx="45" cy="61" rx="7.5" ry="5.5" transform="rotate(-20,45,61)" fill="${gold}"/>
  <!-- Stem -->
  <rect x="51.8" y="30" width="2.8" height="32" rx="1.4" fill="${gold}"/>
  <!-- Flag -->
  <path d="M54.6 30 Q68 37 62 51" stroke="${gold}" stroke-width="2.8" fill="none" stroke-linecap="round"/>

  <circle cx="69" cy="66" r="1.8" fill="${accent}" opacity="0.6"/>
</svg>`;
}

const sizes = [
  // Standard "any" icons
  { name: 'icon-48.png',   size: 48,  maskable: false },
  { name: 'icon-72.png',   size: 72,  maskable: false },
  { name: 'icon-96.png',   size: 96,  maskable: false },
  { name: 'icon-128.png',  size: 128, maskable: false },
  { name: 'icon-144.png',  size: 144, maskable: false },
  { name: 'icon-152.png',  size: 152, maskable: false }, // iPad
  { name: 'icon-167.png',  size: 167, maskable: false }, // iPad Pro
  { name: 'icon-180.png',  size: 180, maskable: false }, // iPhone (apple-touch-icon)
  { name: 'icon-192.png',  size: 192, maskable: false },
  { name: 'icon-256.png',  size: 256, maskable: false },
  { name: 'icon-512.png',  size: 512, maskable: false },
  // Maskable variants (Android adaptive icons)
  { name: 'icon-192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
];

for (const { name, size, maskable } of sizes) {
  const svg = maskable ? makeMaskableSvg(size) : makeSvg(size);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(OUT, name));
  console.log(`✓ ${name}`);
}

// favicon.png — 48px (used by layout.tsx for PNG browsers)
await sharp(Buffer.from(makeSvg(48))).png().toFile(join(__dirname, '../public/favicon.png'));
console.log('✓ favicon.png');

// favicon.svg — vector, looks perfect at any DPI in modern browsers
const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#0A0A0A"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#D4AF37" stroke-width="2.5" opacity="0.35"/>
  <ellipse cx="44" cy="63" rx="9" ry="6.5" transform="rotate(-20,44,63)" fill="#D4AF37"/>
  <rect x="52.2" y="28" width="3.2" height="36" rx="1.6" fill="#D4AF37"/>
  <path d="M55.4 28 Q72 35 65 52" stroke="#D4AF37" stroke-width="3.2" fill="none" stroke-linecap="round"/>
</svg>`;
writeFileSync(join(__dirname, '../public/favicon.svg'), svgFavicon.trim());
console.log('✓ favicon.svg');

// favicon.ico — multi-resolution (16, 32, 48) for legacy browsers / Windows
// Build ICO binary manually: ICO header + directory + PNG payloads
const icoSizes = [16, 32, 48];
const pngBuffers = await Promise.all(
  icoSizes.map((s) => sharp(Buffer.from(makeSvg(s))).png().toBuffer())
);

function buildIco(pngBuffers) {
  const HEADER_SIZE = 6;
  const DIR_ENTRY_SIZE = 16;
  const dirSize = DIR_ENTRY_SIZE * pngBuffers.length;
  let dataOffset = HEADER_SIZE + dirSize;

  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0);              // reserved
  header.writeUInt16LE(1, 2);              // type: 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4);

  const dirEntries = pngBuffers.map((png, i) => {
    const size = icoSizes[i];
    const entry = Buffer.alloc(DIR_ENTRY_SIZE);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);  // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1);  // height
    entry.writeUInt8(0, 2);                         // colour count
    entry.writeUInt8(0, 3);                         // reserved
    entry.writeUInt16LE(1, 4);                      // colour planes
    entry.writeUInt16LE(32, 6);                     // bits per pixel
    entry.writeUInt32LE(png.length, 8);             // image data size
    entry.writeUInt32LE(dataOffset, 12);            // image data offset
    dataOffset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

const icoBuffer = buildIco(pngBuffers);
writeFileSync(join(__dirname, '../public/favicon.ico'), icoBuffer);
console.log('✓ favicon.ico  (16×16, 32×32, 48×48)');

console.log('\nAll icons generated successfully.');
