// Prepare ios-dist/ folder for Capacitor iOS build
// Copies all web assets needed for the app into a clean directory

import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs';

const DEST = 'ios-dist';

// Clean previous build
if (existsSync(DEST)) rmSync(DEST, { recursive: true });
mkdirSync(DEST, { recursive: true });

// Explicitly required files/folders (non-CSS).
// CSS files referenced by index.html are auto-detected below to prevent
// drift between the HTML and the iOS bundle (the cause of the App Store
// rejection on 2026-04-03 — only styles.css was being copied).
const explicitItems = [
  'index.html',
  'script.js',
  'script-legacy.js',
  'manifest.json',
  'sw.js',
  'amogha-logo.png',
  'bg.jpeg',
  'chefchallu.jpg',
  'chefchallu2.jpg',
  'BreakfastAtSimplySouthNew.png',
  'SimplySouthAtKnowledgeCityNew.png',
  'Gemini_Generated_Image_x9jtrox9jtrox9jt.png',
  'pics',
  'assets',
  'menu',
];

// Auto-detect every CSS file referenced by index.html and include them all.
function detectCssFromIndex() {
  if (!existsSync('index.html')) return [];
  const html = readFileSync('index.html', 'utf8');
  const referenced = new Set();
  const linkRe = /<link[^>]+href=["']([^"']+\.css)(?:\?[^"']*)?["'][^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    // Only include root-relative / same-directory CSS (not http(s), not deep paths we don't own)
    if (/^https?:/i.test(href)) continue;
    if (href.startsWith('/')) continue;
    if (href.includes('/')) continue; // e.g. assets/main-xxx.css — already handled via 'assets' dir copy
    referenced.add(href);
  }
  return [...referenced];
}

const detectedCss = detectCssFromIndex();
console.log(`Detected ${detectedCss.length} root-level CSS file(s) referenced by index.html:`);
for (const f of detectedCss) console.log(`  - ${f}`);

// Sanity check: every detected CSS file must exist on disk, otherwise bail.
const missing = detectedCss.filter((f) => !existsSync(f));
if (missing.length) {
  console.error(`\nERROR: index.html references CSS files that don't exist on disk:`);
  for (const f of missing) console.error(`  - ${f}`);
  console.error(`Fix index.html or add the missing files before building for iOS.`);
  process.exit(1);
}

const items = [...explicitItems, ...detectedCss];

for (const item of items) {
  if (!existsSync(item)) {
    console.log(`  skip: ${item} (not found)`);
    continue;
  }
  cpSync(item, `${DEST}/${item}`, { recursive: true });
  console.log(`  copy: ${item}`);
}

// Post-copy verification: confirm every CSS file index.html references is present in DEST.
const verifyMissing = detectedCss.filter((f) => !existsSync(`${DEST}/${f}`));
if (verifyMissing.length) {
  console.error(`\nERROR: ios-dist/ is missing CSS files after copy:`);
  for (const f of verifyMissing) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`\nios-dist/ ready (${items.length} items processed, ${detectedCss.length} CSS files verified)`);
