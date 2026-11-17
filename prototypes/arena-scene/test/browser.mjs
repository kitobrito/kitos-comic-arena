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
        if (result.ok() && options.targets?.length) chosen = { actorSlot, skillIndex, target: options.targets[0] };
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
    await page.waitForTimeout(350);
    const geometry = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth, field: document.querySelector('.scene-field').getBoundingClientRect().toJSON(), skills: [...document.querySelectorAll('.scene-skill')].map(e => e.getBoundingClientRect().toJSON()).filter(r => r.width > 0) }));
    assert.ok(geometry.scroll <= geometry.viewport + 2, JSON.stringify(geometry));
    assert.ok(geometry.skills.every(r => r.width >= 70 && r.x >= 0 && r.right <= geometry.viewport));
    await page.screenshot({ path: `/tmp/arena-scene-${arena}-phone.png`, fullPage: true });
    await page.locator('.scene-team-tab').nth(2).tap();
    assert.equal(await page.locator('.scene-team-tab').nth(2).getAttribute('aria-pressed'), 'true');
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
    console.log(`${arena}: team selection, private start, targeting, two full player/bot turns, phone layout, reduced motion and reload passed`);
    await context.close();
}
assert.deepEqual(errors, []);
await browser.close();
