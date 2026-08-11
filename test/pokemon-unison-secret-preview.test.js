const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

test('production mounts the standalone Pokemon Unison preview at an unlisted no-index route', () => {
    const server = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
    const route = server.match(/const POKEMON_UNISON_PREVIEW_PATH = '([^']+)'/)?.[1];

    assert.match(route || '', /^\/pokemon-unison-[a-f0-9]{24}$/);
    assert.match(server, /createPokemonUnisonHandler\(\{ publicBasePath:/);
    assert.match(server, /X-Robots-Tag', 'noindex, nofollow, noarchive'/);
    assert.match(server, /requestedPath\.endsWith\('\/'\)/);
    assert.match(server, /app\.use\(POKEMON_UNISON_PREVIEW_PATH/);
    assert.match(server, /'\/game-assets'/);
    assert.equal(server.includes(`href="${route}`), false);
});

test('hosted client keeps bot and private play and resolves API routes beneath its mount path', () => {
    const app = fs.readFileSync(
        path.join(projectRoot, 'prototypes', 'pokemon-unison', 'reference', 'app.mjs'),
        'utf8'
    );
    const html = fs.readFileSync(
        path.join(projectRoot, 'prototypes', 'pokemon-unison', 'reference', 'index.html'),
        'utf8'
    );

    assert.match(app, /new URL\('\.', import\.meta\.url\)/);
    assert.match(app, /fetch\(applicationUrl\(path\)/);
    assert.match(app, /opponent === 'bot'/);
    assert.match(html, /id="solo-match-button"/);
    assert.match(html, /id="new-match-button"/);
    assert.match(html, /id="invite-url"/);
    assert.match(html, /id="surrender-button"/);
    assert.match(html, /id="resolve-turn-top-button"/);
    assert.match(app, /\/surrender/);
    assert.match(app, /window\.location\.assign\(applicationLocation\(\)\)/);
    assert.match(app, /resolveTurnTopButton\.addEventListener\('click', resolveTurn\)/);
});

test('character select descriptions and alternate skills require clicks and do not change on hover', () => {
    const app = fs.readFileSync(
        path.join(projectRoot, 'prototypes', 'pokemon-unison', 'reference', 'app.mjs'),
        'utf8'
    );
    const html = fs.readFileSync(
        path.join(projectRoot, 'prototypes', 'pokemon-unison', 'reference', 'index.html'),
        'utf8'
    );

    assert.match(html, /Alternate \/ replacement skills/);
    assert.match(html, /id="selection-skill-detail-description"/);
    assert.match(app, /alternateSkills\.forEach/);
    assert.match(app, /card\.addEventListener\('click', \(\) => renderSelectionSkillDetail/);
    assert.doesNotMatch(app, /card\.addEventListener\('mouseenter', inspect\)/);
    assert.doesNotMatch(app, /button\.addEventListener\('mouseenter', \(\) => \{\s*if \(previewSpeciesId/s);
});

test('battle skill selection dismisses from neutral desktop and mobile surfaces only', () => {
    const app = fs.readFileSync(
        path.join(projectRoot, 'prototypes', 'pokemon-unison', 'reference', 'app.mjs'),
        'utf8'
    );

    assert.match(app, /function dismissSelectedSkill\(\)/);
    assert.match(app, /document\.addEventListener\('dblclick'/);
    assert.match(app, /document\.addEventListener\('pointerup'/);
    assert.match(app, /event\.pointerType !== 'touch'/);
    assert.match(app, /#targeting-readout, \.unit\.targetable, \.target-button/);
    assert.match(app, /selectedSkillId = null;\s*selectedPaymentAction = null;\s*selectedRandomEnergy = \[\];/);
});

test('battle HUD displays server-reserved and target-payment energy instead of the raw pool', () => {
    const app = fs.readFileSync(
        path.join(projectRoot, 'prototypes', 'pokemon-unison', 'reference', 'app.mjs'),
        'utf8'
    );
    assert.match(app, /function displayedEnergyPool\(view, player\)/);
    assert.match(app, /view\.availableEnergy \?\? view\.energy\[player\]/);
    assert.match(app, /selectedPaymentAction\.energyCosts/);
    assert.match(app, /renderEnergy\(elements\.energyA, displayedEnergyPool\(view, 'A'\)\)/);
});

test('opponent skill icons open their full description in the middle readout', () => {
    const app = fs.readFileSync(
        path.join(projectRoot, 'prototypes', 'pokemon-unison', 'reference', 'app.mjs'),
        'utf8'
    );
    assert.match(app, /const inspectable = player !== session\.player/);
    assert.match(app, /kicker: 'OPPONENT SKILL'/);
    assert.match(app, /renderTargetingReadout\(inspectedSkill, inspectedSkill\?\.energy/);
});

test('area skills automatically lock their team target and skip portrait confirmation', () => {
    const app = fs.readFileSync(
        path.join(projectRoot, 'prototypes', 'pokemon-unison', 'reference', 'app.mjs'),
        'utf8'
    );
    assert.match(app, /function isAutomaticAreaTarget\(skill\)/);
    assert.match(app, /if \(isAutomaticAreaTarget\(skill\) && matching\[0\]\)/);
    assert.match(app, /chooseTargetAction\(matching\[0\]\)/);
    assert.match(app, /The full team target is locked/);
});
