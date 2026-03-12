// Prepare ios-dist/ folder for Capacitor iOS build
// Copies all web assets needed for the app into a clean directory

import { cpSync, mkdirSync, rmSync, existsSync } from 'fs';

const DEST = 'ios-dist';

// Clean previous build
if (existsSync(DEST)) rmSync(DEST, { recursive: true });
mkdirSync(DEST, { recursive: true });

// Files and folders to include in the iOS app
const items = [
  'index.html',
  'styles.css',
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

for (const item of items) {
  if (!existsSync(item)) {
    console.log(`  skip: ${item} (not found)`);
    continue;
  }
  cpSync(item, `${DEST}/${item}`, { recursive: true });
  console.log(`  copy: ${item}`);
}

console.log(`\nios-dist/ ready (${items.length} items processed)`);
