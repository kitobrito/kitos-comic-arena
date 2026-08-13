import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createPokemonUnisonServer } from '../reference/server.mjs';

const root = new URL('../', import.meta.url);

test('playable runner uses the standalone API and existing game assets', async () => {
    const [html, app, roster, service, arenaTheme] = await Promise.all([
        readFile(new URL('reference/index.html', root), 'utf8'),
        readFile(new URL('reference/app.mjs', root), 'utf8'),
        readFile(new URL('reference/roster.mjs', root), 'utf8'),
        readFile(new URL('reference/match-service.mjs', root), 'utf8'),
        readFile(new URL('reference/arena-theme.css', root), 'utf8'),
    ]);
    assert.match(html, /Pokemon Unison/);
    assert.match(html, /team-select-a/);
    assert.match(html, /id="selection-preview-shadow"/);
    assert.match(html, /id="selection-form-controls"/);
    assert.match(html, /id="selection-preview-alternates"/);
    assert.match(html, /id="selection-skill-detail-description"/);
    assert.match(html, /noindex, nofollow, noarchive/);
    assert.match(app, /selectionRenderForms/);
    assert.match(app, /const applicationBaseUrl = new URL\('\.', import\.meta\.url\)/);
    assert.match(app, /alternateSkills/);
    assert.match(app, /card\.addEventListener\('click', \(\) => renderSelectionSkillDetail/);
    assert.doesNotMatch(app, /card\.addEventListener\('mouseenter', inspect\)/);
    assert.match(app, /selectionPreviewImage\.dataset\.speciesId = catalogEntry\.id/);
    assert.match(arenaTheme, /data-species-id="krabby"/);
    assert.match(arenaTheme, /data-species-id="pikachu"/);
    assert.match(app, /\/api\/matches/);
    assert.doesNotMatch(app, /from '\.\/engine\.mjs'/);
    assert.match(service, /from '\.\/engine\.mjs'/);
    assert.match(roster, /\/game-assets\/images\/PokemonArena\//);
    assert.match(app, /card\.addEventListener\('click', \(event\) =>/);
    assert.match(app, /event\.target\.closest\('\.unit-portrait, \.unit-skill, \.status-icon'\)/);
    assert.match(html, /id="targeting-readout"/);
    assert.match(html, /id="targeting-arrow-path"/);
    assert.match(app, /targetingSkillDescription\.textContent = skill\.description/);
    assert.match(app, /card\.addEventListener\('pointerenter', \(\) => drawTargetingArrow/);
    assert.match(app, /elements\.targetingArrowPath\.setAttribute/);
    assert.match(app, /drawTargetingArrow\(lockedCard, unitPresentation\(lockedUnit\)\.name\)/);
    assert.match(arenaTheme, /\.unit\.targetable \.unit-skill:disabled\s*\{\s*pointer-events: none;/);
    assert.match(arenaTheme, /\.unit\.targetable\s*\{[^}]*transform: translateY\(-2px\);/s);
    assert.match(arenaTheme, /\.unit\.targetable:hover\s*\{[^}]*transform: translateY\(-3px\);/s);
    assert.match(arenaTheme, /\.unit\.targetable:active\s*\{[^}]*transform: translateY\(1px\) scale\(0\.995\);/s);
    assert.match(arenaTheme, /\.cost-random\s*\{[^}]*background: #050607;/s);
    assert.doesNotMatch(arenaTheme, /\.cost-random\s*\{[^}]*conic-gradient/s);
    assert.match(arenaTheme, /\.targeting-readout\s*\{[^}]*position: absolute;/s);
    assert.doesNotMatch(arenaTheme, /\.targeting-skill-copy > p\s*\{[^}]*line-clamp/s);
    assert.match(app, /document\.addEventListener\('dblclick'/);
    assert.match(app, /event\.pointerType !== 'touch'/);
    assert.match(app, /#targeting-readout, \.unit\.targetable, \.target-button/);
});

test('standalone HTTP API creates, joins, authenticates, queues, and resolves a match', async (t) => {
    const server = createPokemonUnisonServer({ publicBasePath: '/pokemon-unison-preview/' });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const createResponse = await fetch(`${origin}/api/matches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.match(created.invitePath, /^\/pokemon-unison-preview\/\?match=/);

    const joinResponse = await fetch(`${origin}/api/matches/${created.matchId}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inviteCode: created.inviteCode }),
    });
    assert.equal(joinResponse.status, 200);
    const joined = await joinResponse.json();

    const action = (await (
        await fetch(`${origin}/api/matches/${created.matchId}/state`, {
            headers: { authorization: `Bearer ${created.token}` },
        })
    ).json()).state.legalActions[0];
    const actionResponse = await fetch(`${origin}/api/matches/${created.matchId}/queue`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${created.token}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            ...action,
            ...(action.randomEnergyRequired > 0 ? { randomEnergy: action.suggestedRandomEnergy } : {}),
        }),
    });
    assert.equal(actionResponse.status, 200);
    const queued = await actionResponse.json();
    assert.equal(queued.revision, 0);
    assert.equal(queued.queueRevision, 1);
    assert.equal(queued.pendingTurn.actions.length, 1);

    const resolveResponse = await fetch(`${origin}/api/matches/${created.matchId}/resolve`, {
        method: 'POST',
        headers: { authorization: `Bearer ${created.token}` },
    });
    assert.equal(resolveResponse.status, 200);
    const resolved = await resolveResponse.json();
    assert.equal(resolved.revision, 1);
    assert.equal(resolved.state.currentPlayer, 'B');

    const noToken = await fetch(`${origin}/api/matches/${created.matchId}/state`);
    assert.equal(noToken.status, 401);
    assert.ok(joined.token);
});

test('standalone HTTP API can play a full human and bot round without an invite', async (t) => {
    const server = createPokemonUnisonServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const roster = await (await fetch(`${origin}/api/roster`)).json();
    assert.equal(roster.characters.length, 43);

    const created = await (
        await fetch(`${origin}/api/matches`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                opponent: 'bot',
                seed: 666,
                teams: {
                    A: ['pikachu', 'zubat', 'chansey'],
                    B: ['bulbasaur', 'squirtle', 'charmander'],
                },
            }),
        })
    ).json();
    assert.equal(created.mode, 'solo');
    assert.equal(created.waitingForOpponent, false);
    assert.equal(created.inviteCode, undefined);
    assert.equal(created.invitePath, undefined);
    assert.deepEqual(created.state.teams.A.map((unit) => unit.speciesId), ['pikachu', 'zubat', 'chansey']);

    const action = created.state.legalActions[0];
    const queued = await (
        await fetch(`${origin}/api/matches/${created.matchId}/queue`, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${created.token}`,
                'content-type': 'application/json',
            },
        body: JSON.stringify({
            ...action,
            ...(action.randomEnergyRequired > 0 ? { randomEnergy: action.suggestedRandomEnergy } : {}),
        }),
        })
    ).json();
    assert.equal(queued.pendingTurn.actions.length, 1);

    const resolved = await (
        await fetch(`${origin}/api/matches/${created.matchId}/resolve`, {
            method: 'POST',
            headers: { authorization: `Bearer ${created.token}` },
        })
    ).json();
    assert.equal(resolved.revision, 2);
    assert.equal(resolved.state.currentPlayer, 'A');
    assert.equal(resolved.state.recentEvents.some((event) => event.player === 'B'), true);
});

test('standalone HTTP API records surrender', async (t) => {
    const server = createPokemonUnisonServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;
    const created = await (await fetch(`${origin}/api/matches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ opponent: 'bot' }),
    })).json();
    const response = await fetch(`${origin}/api/matches/${created.matchId}/surrender`, {
        method: 'POST',
        headers: { authorization: `Bearer ${created.token}` },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).state.winner, 'B');
});

test('server confines requests to reference and game asset roots', async () => {
    const server = await readFile(new URL('reference/server.mjs', root), 'utf8');
    assert.match(server, /safeResolve/);
    assert.match(server, /target\.startsWith/);
    assert.doesNotMatch(server, /Access-Control-Allow-Origin/);
    assert.match(server, /createPokemonUnisonHandler/);
    assert.match(server, /x-robots-tag/);
});

test('Haskell serializer and Elm decoder share protocol-v1 boundary fields', async () => {
    const [model, engine, elm] = await Promise.all([
        readFile(new URL('haskell/src/Pokemon/Model.hs', root), 'utf8'),
        readFile(new URL('haskell/src/Pokemon/Engine.hs', root), 'utf8'),
        readFile(new URL('elm/src/Main.elm', root), 'utf8'),
    ]);
    for (const field of [
        'protocolVersion',
        'turnNumber',
        'currentPlayer',
        'winner',
        'viewer',
        'teams',
        'legalActions',
        'recentEvents',
    ]) {
        assert.match(model, new RegExp(`"${field}"`));
        assert.match(elm, new RegExp(`"${field}"`));
    }
    assert.match(engine, /viewerState/);
    assert.match(engine, /validateAction game action == Right \(\)/);
});
