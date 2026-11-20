// Screenshots of the damage preview while aiming and of shots in flight (run after serve.cjs).
//   PLAYWRIGHT_MODULE=... OUT=/tmp/ ARENAS=pokemon,comic SIZE='{"width":390,"height":844}' node prototypes/arena-scene/test/aim-shots.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.SCENE_CHROME || '/usr/bin/chromium', args: ['--no-sandbox'] });
const base = 'http://127.0.0.1:4197', out = process.env.OUT || '/tmp/';
const size = process.env.SIZE ? JSON.parse(process.env.SIZE) : { width: 1365, height: 1000 };
const phone = size.width <= 700;
const errors = [], report = {};
for (const arena of (process.env.ARENAS || 'pokemon,comic').split(',')) {
    const context = await browser.newContext({ viewport: { width: 1365, height: 1000 }, hasTouch: phone, isMobile: false, deviceScaleFactor: Number(process.env.DPR || 1) });
    await context.addCookies([{ name: 'comic_session', value: jwt.sign({ username: 'SceneAdmin' }, 'arena-scene-local-test-only'), domain: '127.0.0.1', path: '/' }]);
    await context.route('**/*', r => r.request().resourceType() === 'media' || /googletagmanager|googleapis|gstatic/.test(r.request().url()) ? r.abort() : r.continue());
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    // POSE_AS=<render name>: every render borrows that render's pose frames (checks placement on both sides).
    if (process.env.POSE_AS) {
        const { listRenders } = require('../../../scripts/build-scene-poses.js');
        const book = JSON.parse(require('node:fs').readFileSync(new URL('../../../assets/data/scene-poses.json', import.meta.url), 'utf8')).poses;
        const renders = listRenders(), from = renders.find(r => r.name === process.env.POSE_AS).render;
        const poses = Object.fromEntries(renders.map(r => [r.render, book[from]]));
        await context.route('**/scene-poses.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ poses }) }));
    }
    await page.addInitScript(() => { window.__buzz = []; navigator.vibrate = p => { window.__buzz.push(p); return true; }; });
    await page.goto(`${base}/arena-scene/?arena=${arena}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ArenaSceneSelection && document.querySelector('.slot-item[data-index]:not(.slot-empty)'));
    const team = process.env.TEAM ? process.env.TEAM.split(',') : arena === 'pokemon' ? ['charmander', 'squirtle', 'pikachu'] : ['iron-man', 'spider-man', 'captain-america'];
    const indices = await page.evaluate(ids => ids.map(id => window.characters.findIndex(c => c.characterId === id)), team);
    await page.waitForTimeout(1500);
    for (const i of indices) await page.locator(`.slot-item[data-index="${i}"]`).dblclick();
    await page.waitForFunction(() => window.ArenaSceneSelection.team().length === 3);
    await page.locator('.scene-start').click();
    await page.waitForURL('**/arena-scene/ingame.html?**', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ArenaSceneState && !document.body.classList.contains('app-loading'));
    await page.waitForFunction(() => [...document.querySelectorAll('.scene-actor-art')].every(i => i.complete && i.naturalWidth > 0), { timeout: 25000 });
    await page.setViewportSize(size); await page.waitForTimeout(900);
    // Record every pose shown (only visible when pose art exists for a fighter).
    await page.evaluate(() => { window.__poses = []; new MutationObserver(rs => rs.forEach(r => { const c = r.target; if (c.classList.contains('scene-posing')) window.__poses.push(`${c.dataset.sceneSide}${c.dataset.sceneSlot}:${c.dataset.pose}`); })).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] }); });
    const tap = async loc => phone ? loc.tap() : loc.click();
    const rows = [];
    for (let slot = 0; slot < 3; slot++) {
        const minis = page.locator(`.scene-fieldbar[data-slot="${slot}"] .scene-mini`);
        let aimed = false;
        for (let k = 0; k < 4 && !aimed; k++) {
            const m = minis.nth(k);
            if (!(await m.isVisible()) || await m.isDisabled() || /scene-unavailable|scene-on-cooldown/.test(await m.getAttribute('class'))) continue;
            await tap(m); await page.waitForTimeout(350);
            const info = await page.evaluate(() => ({
                targets: [...document.querySelectorAll('.character-card.targetable')].filter(c => c.dataset.sceneSide === 'opponent').length,
                ghosts: [...document.querySelectorAll('.scene-dmg-ghost')].map(g => g.textContent),
                chunks: [...document.querySelectorAll('.scene-dmg-chunk')].map(c => c.style.width),
                chunkInfo: [...document.querySelectorAll('.scene-dmg-chunk')].map(c => { const r = c.getBoundingClientRect(), cs = getComputedStyle(c); return [Math.round(r.left), Math.round(r.width), Math.round(r.height), cs.position, cs.display, cs.opacity, c.parentElement.className, Math.round(c.parentElement.getBoundingClientRect().width)]; }),
                tips: [...document.querySelectorAll('.target-damage-preview')].map(t => t.textContent),
            }));
            if (!info.targets) { await tap(m); await page.waitForTimeout(200); continue; }
            rows.push({ slot, skill: k, ...info });
            if (rows.length === 1) await page.screenshot({ path: `${out}aim-${arena}-${size.width}.png` });
            const foe = page.locator('.enemy-characters .character-card.targetable .character-face').first();
            await (phone ? foe.tap({ force: true }) : foe.click({ force: true }));
            await page.waitForTimeout(300);
            aimed = true;
        }
    }
    const afterAim = await page.evaluate(() => ({ ghostsLeft: document.querySelectorAll('.scene-dmg-ghost').length, buzz: window.__buzz }));
    // Ready, then grab frames while shots fly.
    await page.evaluate(() => { window.__casts = []; const o = window.BattleFX.cast; window.BattleFX.cast = (opts) => { window.__casts.push([opts.characterId, opts.skillId, window.BattleFX.profileFor(opts.characterId, opts.skillId)?.delivery]); return o(opts); }; });
    await tap(page.locator('.ready-text'));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.ChakraChooseEndTurn')).visibility === 'visible');
    for (let i = 0; i < 12; i++) {
        if (!Number(await page.locator('.chakrachoose .chakrachoosered').textContent())) break;
        const rows = page.locator('.ChakraChooseEndTurn .chakra-column .chakra-row');
        for (let row = 0; row < 4; row++) if (Number(await rows.nth(row).locator('.chakra-amount').textContent()) > 0) { await rows.nth(row).locator('.plus-button').click(); await page.waitForTimeout(150); break; }
    }
    await page.locator('.ok-buttonendturn').click();
    let shotsSeen = 0, frames = 0;
    for (let t = 0; t < 140; t++) {
        const n = await page.evaluate(() => document.querySelectorAll('.scene-shot, .scene-posing').length);
        if (n) { shotsSeen = Math.max(shotsSeen, n); if (frames < 14) { await page.screenshot({ path: `${out}shot-${arena}-${size.width}-${frames}.png` }); frames++; } }
        await page.waitForTimeout(n ? 10 : 60);
    }
    if (process.env.KO) {
        await page.evaluate(([side, slot]) => { window.__koSide = side; window.__koSlot = Number(slot); }, (process.env.KO + ':1').split(':'));
        await page.evaluate(() => window.BattleFX.death(document.querySelector(`.${(window.__koSide || 'player')}-characters .character-card[data-scene-slot="${window.__koSlot ?? 1}"]`)));
        // Snap the frame while the KO pose is up (a live state update clears it from a fighter who isn't really out).
        for (let i = 0; i < 40; i++) {
            const up = await page.evaluate(() => document.querySelector(`.${window.__koSide}-characters .character-card[data-scene-slot="${window.__koSlot}"]`)?.classList.contains('scene-posing') && document.querySelector(`.${window.__koSide}-characters .character-card[data-scene-slot="${window.__koSlot}"]`).dataset.pose === 'ko');
            if (up) { await page.waitForTimeout(i ? 0 : 0); await page.screenshot({ path: `${out}ko-${arena}-${size.width}.png` }); break; }
            await page.waitForTimeout(40);
        }
    }
    report[arena] = { poses: [...new Set(await page.evaluate(() => window.__poses))], aimed: rows, ...afterAim, shotsSeen, frames, casts: await page.evaluate(() => window.__casts), turn: await page.evaluate(() => [window.ArenaSceneState.match.currentTurn, window.ArenaSceneState.match.turnNumber, document.querySelector('.scene-hint')?.textContent]) };
    const matchId = new URL(page.url()).searchParams.get('matchId');
    await context.request.post(`${base}/api/match/${matchId}/surrender`);
    await context.close();
}
console.log(JSON.stringify(report, null, 1));
if (errors.length) console.log('PAGE ERRORS', errors);
await browser.close();
