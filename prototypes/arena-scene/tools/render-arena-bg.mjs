// Renders arena.svg to arena.webp (the file the preview actually loads).
// PLAYWRIGHT_MODULE / SCENE_CHROME as for test/browser.mjs.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';
const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.SCENE_CHROME || undefined, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 2400, height: 1000 } });
const svg = await readFile(join(here, '..', 'arena.svg'), 'utf8');
await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
await page.screenshot({ path: join(here, '..', 'arena.png') });
await browser.close();
console.log('rendered arena.png');
