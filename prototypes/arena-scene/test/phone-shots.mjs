// Phone screenshots of the experimental battlefield (run after `node prototypes/arena-scene/test/serve.cjs`).
//   PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs OUT=/tmp/ node prototypes/arena-scene/test/phone-shots.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const { chromium, devices } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.SCENE_CHROME || '/usr/bin/chromium', args: ['--no-sandbox'] });
const base = 'http://127.0.0.1:4197';
const out = process.env.OUT || '/tmp/';
const errors = [];
for (const arena of (process.env.ARENAS || 'pokemon,comic').split(',')) {
    const context = await browser.newContext({ viewport: { width: 1365, height: 1000 }, hasTouch: true });
    await context.addCookies([{ name: 'comic_session', value: jwt.sign({ username: 'SceneAdmin' }, 'arena-scene-local-test-only'), domain: '127.0.0.1', path: '/' }]);
    await context.route('**/*', route => route.request().resourceType() === 'media' || /googletagmanager|googleapis|gstatic/.test(route.request().url()) ? route.abort() : route.continue());
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/arena-scene/?arena=${arena}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ArenaSceneSelection && document.querySelector('.slot-item[data-index]:not(.slot-empty)'));
    const team = arena === 'pokemon' ? ['charmander', 'bulbasaur', 'pikachu'] : ['iron-man', 'spider-man', 'captain-america'];
    const indices = await page.evaluate(ids => ids.map(id => window.characters.findIndex(c => c.characterId === id)), team);
    await page.waitForTimeout(2000);
    for (const index of indices) await page.locator(`.slot-item[data-index="${index}"]`).dblclick();
    await page.waitForFunction(() => window.ArenaSceneSelection.team().length === 3);
    await page.locator('.scene-start').click();
    await page.waitForURL('**/arena-scene/ingame.html?**', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ArenaSceneState && !document.body.classList.contains('app-loading'));
    await page.waitForFunction(() => [...document.querySelectorAll('.scene-actor-art')].every(i => i.complete && i.naturalWidth > 0), { timeout: 25000 });
    for (const [name, size] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }], ['desktop', { width: 1365, height: 1000 }]]) {
        await page.setViewportSize(size); await page.waitForTimeout(700);
        const geo = await page.evaluate(() => {
            const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; };
            const rect = (e) => e.getBoundingClientRect().toJSON();
            return {
                viewport: innerWidth, scroll: document.documentElement.scrollWidth,
                fieldbars: [...document.querySelectorAll('.scene-fieldbar:not(.scene-enemybar)')].filter(vis).map(rect),
                enemybars: [...document.querySelectorAll('.scene-enemybar')].filter(vis).map(rect),
                minis: [...document.querySelectorAll('.scene-fieldbar:not(.scene-enemybar) .scene-mini')].filter(vis).length,
                roster: [...document.querySelectorAll('.scene-roster')].some(vis),
                faces: [...document.querySelectorAll('.character-card .character-face')].map(rect),
            };
        });
        const fit = await page.evaluate(() => {
            const field = document.querySelector('.scene-field').getBoundingClientRect();
            const bars = [...document.querySelectorAll('.scene-fieldbar')].filter(b => b.getBoundingClientRect().width > 0 && getComputedStyle(b).display !== 'none').map(b => b.getBoundingClientRect());
            const figures = [...document.querySelectorAll('.character-card[data-scene-side]:not(.scene-knocked-out)')].map(c => c.getBoundingClientRect());
            const apart = (a, b) => a.right <= b.left + 2 || b.right <= a.left + 2 || a.bottom <= b.top + 2 || b.bottom <= a.top + 2;
            return { clipped: bars.filter(r => r.bottom > field.bottom + 1 || r.top < field.top || r.left < 0 || r.right > innerWidth).length,
                coveringFighters: bars.reduce((n, r) => n + figures.filter(f => !apart(r, f)).length, 0),
                barsOverlapping: bars.reduce((n, r, i) => n + bars.slice(i + 1).filter(o => !apart(r, o)).length, 0) };
        });
        console.log(`${arena} ${name}: ${JSON.stringify({ viewport: geo.viewport, scroll: geo.scroll, bars: geo.fieldbars.length, enemyBars: geo.enemybars.length, skillButtons: geo.minis, stackedList: geo.roster, ...fit })}`);
        if (process.env.GEO) console.log(JSON.stringify(geo));
        await page.screenshot({ path: `${out}scene-${arena}-${name}.png`, fullPage: true });
    }
    const matchId = new URL(page.url()).searchParams.get('matchId');
    await context.request.post(`${base}/api/match/${matchId}/surrender`);
    await context.close();
}
if (errors.length) console.log('PAGE ERRORS', errors);
await browser.close();
