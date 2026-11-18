// Run after `node prototypes/arena-scene/test/serve.cjs` (loopback fixture).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browserType = process.env.SCENE_BROWSER === 'webkit' ? webkit : chromium;
const browser = await browserType.launch(browserType === chromium ? { executablePath: process.env.SCENE_CHROME || '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
const base = 'http://127.0.0.1:4197';
const errors = [];
for (const arena of ['pokemon', 'comic']) {
    const context = await browser.newContext({ viewport: { width: 1365, height: 1000 }, hasTouch: true });
    await context.addCookies([{ name: 'comic_session', value: jwt.sign({ username: 'SceneAdmin' }, 'arena-scene-local-test-only'), domain: '127.0.0.1', path: '/' }]);
    await context.route('**/*', route => route.request().resourceType() === 'media' || /googletagmanager|googleapis|gstatic/.test(route.request().url()) ? route.abort() : route.continue());
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/arena-scene/?arena=${arena}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ArenaSceneSelection && document.querySelector('.slot-item[data-index]:not(.slot-empty)'));
    const team = arena === 'pokemon' ? ['charmander', 'bulbasaur', 'pikachu'] : ['iron-man', 'spider-man', 'captain-america'];
    const indices = await page.evaluate(ids => ids.map(id => window.characters.findIndex(c => c.characterId === id)), team);
    await page.waitForTimeout(2000);
    for (const index of indices) {
        const tile = page.locator(`.slot-item[data-index="${index}"]`);
        await tile.dblclick();
    }
    await page.waitForFunction(() => window.ArenaSceneSelection.team().length === 3);
    const teamSaves = [];
    page.on('request', request => { if (request.url().includes('/api/team/save')) teamSaves.push(request.url()); });
    await page.locator('.scene-start').click();
    await page.waitForURL('**/arena-scene/ingame.html?**', { waitUntil: 'domcontentloaded' });
    console.log(arena + ': private match opened');
    await page.waitForFunction(() => window.ArenaSceneState && !document.body.classList.contains('app-loading'));
    await page.waitForFunction(() => [...document.querySelectorAll('.scene-actor-art')].every(i => i.complete && i.naturalWidth > 0), { timeout: 25000 });
    assert.equal(teamSaves.length, 0);
    const matchId = new URL(page.url()).searchParams.get('matchId');
    async function endTurn() {
        await page.locator('.ready-text').click();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.ChakraChooseEndTurn')).visibility === 'visible');
        for (let i = 0; i < 12; i++) {
            const unresolved = Number(await page.locator('.chakrachoose .chakrachoosered').textContent());
            if (!unresolved) break;
            const rows = page.locator('.ChakraChooseEndTurn .chakra-column .chakra-row');
            let clicked = false;
            for (let row = 0; row < 4; row++) {
                const entry = rows.nth(row);
                if (Number(await entry.locator('.chakra-amount').textContent()) > 0) {
                    await entry.locator('.plus-button').click(); clicked = true; await page.waitForTimeout(200); break;
                }
            }
            assert.ok(clicked, 'An unspent color must be available for random costs.');
        }
        await page.locator('.ok-buttonendturn').click();
        await page.waitForFunction(() => !document.body.classList.contains('end-turn-modal-open'));
        await page.waitForFunction(() => window.ArenaSceneState.match.currentTurn === window.ArenaSceneState.match.player.username && window.ArenaSceneState.match.turnNumber >= 2, { timeout: 20000 });
    }
    // The live rules start the first player with one energy. Bank it for turn two.
    await endTurn();
    console.log(arena + ': first bot turn complete');
    let chosen;
    for (let actorSlot = 0; actorSlot < 3 && !chosen; actorSlot++) for (let skillIndex = 0; skillIndex < 4 && !chosen; skillIndex++) {
        const result = await context.request.post(`${base}/api/match/${matchId}/skill/targets`, { data: { actorSlot, skillIndex } });
        const options = await result.json();
        // Only a skill the battlefield shows as usable (the server's list ignores stuns and missing energy).
        const usable = await page.evaluate(([slot, index]) => { const b = [...document.querySelectorAll(`[data-slot="${slot}"] .scene-skill`)].filter(e => e.getBoundingClientRect().width > 0)[index];
            return Boolean(b) && !b.disabled && !b.matches('.scene-unavailable,.scene-on-cooldown'); }, [actorSlot, skillIndex]);
        if (usable && result.ok() && options.targets?.length) chosen = { actorSlot, skillIndex, target: options.targets[0] };
    }
    console.log(arena + ': real skill selected');
    assert.ok(chosen, 'A real skill must be usable on the second turn.');
    await page.locator(`[data-slot="${chosen.actorSlot}"] .scene-skill:visible`).nth(chosen.skillIndex).click();
    await page.waitForSelector('.character-card.targetable');
    const side = await page.evaluate(target => target.username === window.ArenaSceneState.match.player.username ? 'player' : 'opponent', chosen.target);
    const target = page.locator(`.character-card[data-scene-side="${side}"][data-scene-slot="${chosen.target.slot}"] .character-face`);
    await target.click({ force: true });
    // Class-select skills use the exact existing class-choice dialog.
    const choice = page.locator('.class-choice-popup.visible .class-choice-popup-options button').first();
    if (await choice.isVisible()) await choice.click();
    await page.waitForFunction(() => Object.keys(window.ArenaSceneState.match.pendingTurn.queuedByActorSlot).length > 0);
    await page.waitForFunction(() => document.querySelector('.scene-queue').textContent.includes('queued'));
    assert.ok((await page.locator('.scene-queue').textContent()).includes('queued'));
    await page.screenshot({ path: `/tmp/arena-scene-${arena}-desktop.png`, fullPage: true });
    await endTurn();
    const state = await page.evaluate(() => window.ArenaSceneState.match);
    assert.ok(state.turnNumber >= 4);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    // Phones: each fighter keeps its skills in a 2x2 square under its feet on the battlefield.
    const geometry = await page.evaluate(() => {
        const shown = e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none';
        const bars = sel => [...document.querySelectorAll(sel)].filter(shown).map(b => ({ rect: b.getBoundingClientRect().toJSON(), skills: [...b.querySelectorAll('.scene-mini')].filter(shown).map(m => m.getBoundingClientRect().toJSON()) }));
        return { viewport: innerWidth, scroll: document.documentElement.scrollWidth, field: document.querySelector('.scene-field').getBoundingClientRect().toJSON(),
            figures: [...document.querySelectorAll('.character-card[data-scene-side]:not(.scene-knocked-out)')].map(c => ({ side: c.dataset.sceneSide, slot: c.dataset.sceneSlot, rect: c.getBoundingClientRect().toJSON() })), mine: bars('.scene-fieldbar:not(.scene-enemybar)'), theirs: bars('.scene-enemybar'), alive: document.querySelectorAll('.scene-fieldbar:not(.scene-enemybar):not(.is-out)').length, out: [...document.querySelectorAll('.scene-fieldbar:not(.scene-enemybar).is-out')].map(b => window.ArenaSceneState.match.player.team?.[Number(b.dataset.slot)]?.hp ?? b.dataset.slot), stacked: [...document.querySelectorAll('.scene-roster')].some(shown) };
    });
    assert.ok(geometry.scroll <= geometry.viewport + 2, JSON.stringify(geometry));
    assert.equal(geometry.stacked, false, 'the stacked skill panels are gone on phones');
    assert.equal(geometry.mine.length, geometry.alive, `one skill square per fighter still standing (knocked out: ${JSON.stringify(geometry.out)})`);
    assert.ok(geometry.alive >= 1);
    if (geometry.out.length) console.log(`${arena}: knocked-out fighters hide their square: ${JSON.stringify(geometry.out)}`);
    for (const bar of geometry.mine) {
        assert.equal(bar.skills.length, 4, 'four skills under each fighter');
        assert.ok(bar.skills.every(r => r.width >= 30), 'skills stay big enough to tap');
        const cols = new Set(bar.skills.map(r => Math.round(r.x))).size, rows = new Set(bar.skills.map(r => Math.round(r.y))).size;
        assert.ok(cols === 2 && rows === 2, `a 2x2 square (${cols}x${rows})`);
    }
    const all = [...geometry.mine, ...geometry.theirs].map(b => b.rect);
    for (const r of all) assert.ok(r.left >= 0 && r.right <= geometry.viewport && r.top >= geometry.field.top && r.bottom <= geometry.field.bottom + 1, `inside the battlefield ${JSON.stringify(r)}`);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, `skill squares do not overlap ${JSON.stringify([a, b])}`);
    }
    // No skill square covers any fighter.
    for (const r of all) for (const f of geometry.figures) {
        const a = r, b = f.rect, pad = 2;
        assert.ok(a.right <= b.left + pad || b.right <= a.left + pad || a.bottom <= b.top + pad || b.bottom <= a.top + pad, `a skill square overlaps the ${f.side} fighter in slot ${f.slot}: ${JSON.stringify([a, b])}`);
    }
    await page.screenshot({ path: `/tmp/arena-scene-${arena}-phone.png`, fullPage: true });
    // Play a skill from a square with taps: it folds down to the chosen skill and its target.
    let phoneChoice;
    for (let actorSlot = 0; actorSlot < 3 && !phoneChoice; actorSlot++) for (let skillIndex = 0; skillIndex < 4 && !phoneChoice; skillIndex++) {
        const result = await context.request.post(`${base}/api/match/${matchId}/skill/targets`, { data: { actorSlot, skillIndex } });
        const options = await result.json();
        // Only a skill the battlefield shows as usable right now (not stunned, on cooldown or short of energy).
        const usable = await page.evaluate(([slot, index]) => { const b = document.querySelectorAll(`.scene-fieldbar[data-slot="${slot}"] .scene-mini`)[index];
            return Boolean(b) && !b.disabled && !b.matches('.scene-unavailable,.scene-on-cooldown'); }, [actorSlot, skillIndex]);
        if (usable && result.ok() && options.targets?.length) phoneChoice = { actorSlot, skillIndex, target: options.targets[0] };
    }
    assert.ok(phoneChoice, 'A real skill must be usable on the phone turn.');
    await page.locator(`.scene-fieldbar[data-slot="${phoneChoice.actorSlot}"] .scene-mini`).nth(phoneChoice.skillIndex).tap();
    try { await page.waitForSelector('.character-card.targetable', { timeout: 8000 }); } catch (error) {
        await page.screenshot({ path: `/tmp/arena-scene-${arena}-phone-debug.png`, fullPage: true });
        console.log('DEBUG', JSON.stringify(phoneChoice), await page.evaluate(slot => ({
            bar: document.querySelector(`.scene-fieldbar[data-slot="${slot}"]`)?.className,
            minis: [...document.querySelectorAll(`.scene-fieldbar[data-slot="${slot}"] .scene-mini`)].map(m => `${m.dataset.name}|${m.className}|${m.disabled}`),
            armed: document.querySelector('.scene-armed')?.dataset.name, queued: window.ArenaSceneState.match.pendingTurn,
        }), phoneChoice.actorSlot));
        throw error;
    }
    const phoneSide = await page.evaluate(target => target.username === window.ArenaSceneState.match.player.username ? 'player' : 'opponent', phoneChoice.target);
    await page.locator(`.character-card[data-scene-side="${phoneSide}"][data-scene-slot="${phoneChoice.target.slot}"] .character-face`).tap({ force: true });
    const phonePick = page.locator('.class-choice-popup.visible .class-choice-popup-options button').first();
    if (await phonePick.isVisible()) await phonePick.tap();
    await page.waitForSelector(`.scene-fieldbar[data-slot="${phoneChoice.actorSlot}"].is-queued`);
    await page.screenshot({ path: `/tmp/arena-scene-${arena}-phone-queued.png`, fullPage: true });
    await page.locator('.ready-text').tap();
    await page.waitForFunction(() => document.body.classList.contains('end-turn-modal-open'));
    const modal = await page.locator('.ChakraChooseEndTurn').boundingBox();
    assert.ok(modal.x >= 0 && modal.x + modal.width <= 391, JSON.stringify(modal));
    await page.screenshot({ path: `/tmp/arena-scene-${arena}-phone-energy.png`, fullPage: true });
    await page.locator('.cancel-buttonendturn').tap();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.scene-actor-art').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ArenaSceneState && !document.body.classList.contains('app-loading'));
    assert.equal(new URL(page.url()).searchParams.get('matchId'), matchId);
    await context.request.post(`${base}/api/match/${matchId}/surrender`);
    console.log(`${arena}: team selection, private start, targeting, two full player/bot turns, phone skill squares, reduced motion and reload passed`);
    await context.close();
}
assert.deepEqual(errors, []);
await browser.close();
