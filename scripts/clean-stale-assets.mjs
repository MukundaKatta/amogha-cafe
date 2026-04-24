#!/usr/bin/env node
// Post-build cleanup: remove hashed chunks in /assets/ that the current
// script.js / script-legacy.js no longer references. Vite is configured
// with emptyOutDir:false (correct, so it doesn't wipe index.html / pics
// / etc.), but that means stale chunks accumulate every build. This
// script keeps the directory in sync with the latest manifest.
import { readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

const entries = ['script.js', 'script-legacy.js']
    .map(p => join(ROOT, p))
    .filter(p => { try { statSync(p); return true; } catch { return false; } });

if (!entries.length) {
    console.error('clean-stale-assets: no script.js/script-legacy.js found, run after build');
    process.exit(1);
}

// Collect every "assets/<name>-<hash>.js" reference across both bundles.
const referenced = new Set();
const refRegex = /assets\/[A-Za-z0-9_-]+\.js/g;
const cssRefRegex = /assets\/[A-Za-z0-9_-]+\.css/g;
for (const f of entries) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(refRegex)) referenced.add(m[0].replace(/^assets\//, ''));
    for (const m of src.matchAll(cssRefRegex)) referenced.add(m[0].replace(/^assets\//, ''));
}

// Also scan all referenced chunks for further imports they bring in.
let pending = [...referenced];
while (pending.length) {
    const next = [];
    for (const name of pending) {
        const p = join(ASSETS, name);
        try {
            const src = readFileSync(p, 'utf8');
            for (const m of src.matchAll(refRegex)) {
                const r = m[0].replace(/^assets\//, '');
                if (!referenced.has(r)) { referenced.add(r); next.push(r); }
            }
            for (const m of src.matchAll(/[A-Za-z0-9_-]+-[A-Za-z0-9_-]+\.js/g)) {
                const r = m[0];
                if (r === 'script.js' || r === 'script-legacy.js') continue;
                if (!referenced.has(r) && readdirSync(ASSETS).includes(r)) {
                    referenced.add(r); next.push(r);
                }
            }
        } catch {}
    }
    pending = next;
}

// Anything in /assets/ not in `referenced` is stale.
const all = readdirSync(ASSETS).filter(f => /\.(js|css)$/i.test(f));
const stale = all.filter(f => !referenced.has(f));

let bytes = 0;
for (const f of stale) {
    const p = join(ASSETS, f);
    try {
        bytes += statSync(p).size;
        unlinkSync(p);
    } catch (e) {
        console.warn('clean-stale-assets: could not remove', f, e.message);
    }
}

console.log(`clean-stale-assets: removed ${stale.length} stale chunks (${(bytes/1024).toFixed(0)} KB), kept ${referenced.size}`);
