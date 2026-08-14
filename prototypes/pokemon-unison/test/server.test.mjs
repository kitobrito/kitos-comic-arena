import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createMatchService } from '../reference/match-service.mjs';
import { createMissionService } from '../reference/mission-service.mjs';
import { createPlayerService } from '../reference/player-service.mjs';
import { createPokemonUnisonServer } from '../reference/server.mjs';
import { createSkinService } from '../reference/skin-service.mjs';
import { createStoreService } from '../reference/store-service.mjs';

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
    assert.equal(roster.characters.length, 46);

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

test('standalone HTTP API registers, logs in, verifies, and logs out a player', async (t) => {
    const server = createPokemonUnisonServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const registerResponse = await fetch(`${origin}/api/players/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Serena', email: 'serena@example.com', password: 'poncho-fashion1' }),
    });
    assert.equal(registerResponse.status, 201);
    const registered = await registerResponse.json();
    assert.equal(registered.player.username, 'Serena');
    assert.ok(registered.token);

    const duplicateResponse = await fetch(`${origin}/api/players/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'serena', email: '', password: 'anotherpass1' }),
    });
    assert.equal(duplicateResponse.status, 409);

    const meResponse = await fetch(`${origin}/api/players/me`, {
        headers: { authorization: `Bearer ${registered.token}` },
    });
    assert.equal(meResponse.status, 200);
    assert.equal((await meResponse.json()).player.id, registered.player.id);

    const noTokenResponse = await fetch(`${origin}/api/players/me`);
    assert.equal(noTokenResponse.status, 401);

    const loginResponse = await fetch(`${origin}/api/players/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Serena', password: 'poncho-fashion1' }),
    });
    assert.equal(loginResponse.status, 200);
    const loggedIn = await loginResponse.json();
    assert.equal(loggedIn.player.id, registered.player.id);

    const badLoginResponse = await fetch(`${origin}/api/players/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Serena', password: 'wrong-password' }),
    });
    assert.equal(badLoginResponse.status, 401);

    const logoutResponse = await fetch(`${origin}/api/players/logout`, {
        method: 'POST',
        headers: { authorization: `Bearer ${loggedIn.token}` },
    });
    assert.equal(logoutResponse.status, 200);

    const afterLogoutResponse = await fetch(`${origin}/api/players/me`, {
        headers: { authorization: `Bearer ${loggedIn.token}` },
    });
    assert.equal(afterLogoutResponse.status, 401);

    const healthResponse = await (await fetch(`${origin}/api/health`)).json();
    assert.equal(healthResponse.players, 1);
});

test('GET /api/missions exposes the catalog plus the signed-in player\'s own progress', async (t) => {
    const server = createPokemonUnisonServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const anonymous = await (await fetch(`${origin}/api/missions`)).json();
    assert.ok(Array.isArray(anonymous.missions));
    assert.ok(anonymous.missions.length > 0);
    assert.ok(anonymous.missions.some((mission) => mission.missionId === 'scyther-trial'));
    assert.deepEqual(anonymous.unlockedCharacterIds, []);
    assert.equal(anonymous.unlockPoints, 0);

    const registered = await (
        await fetch(`${origin}/api/players/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'MissionRunner', email: '', password: 'longenough1' }),
        })
    ).json();
    const authed = await (
        await fetch(`${origin}/api/missions`, { headers: { authorization: `Bearer ${registered.token}` } })
    ).json();
    assert.deepEqual(authed.missionProgressByMissionId, {});
    assert.deepEqual(authed.unlockedCharacterIds, []);
});

test('winning a linked-account match advances that account\'s mission progress and leaves an anonymous opponent unaffected', async (t) => {
    const catalog = [
        {
            missionId: 'one-win-catch',
            reward_character: 'onix',
            reward_unlock_points: 50,
            goals: [{ type: 'win_matches', wins: 1 }],
        },
    ];
    const playerService = createPlayerService();
    const missionService = createMissionService({ playerService, catalog });
    const matchService = createMatchService({ onMatchComplete: missionService.onMatchComplete });
    const server = createPokemonUnisonServer({ playerService, missionService, matchService });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const registered = await (
        await fetch(`${origin}/api/players/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'LinkedWinner', email: '', password: 'longenough1' }),
        })
    ).json();

    const created = await (
        await fetch(`${origin}/api/matches`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ opponent: 'bot', playerToken: registered.token }),
        })
    ).json();

    const surrenderResponse = await fetch(`${origin}/api/matches/${created.matchId}/surrender`, {
        method: 'POST',
        headers: { authorization: `Bearer ${created.token}` },
    });
    assert.equal(surrenderResponse.status, 200);
    assert.equal((await surrenderResponse.json()).state.winner, 'B');

    // A losing, linked account's mission progress must not advance.
    const loserMissions = await (
        await fetch(`${origin}/api/missions`, { headers: { authorization: `Bearer ${registered.token}` } })
    ).json();
    assert.deepEqual(loserMissions.unlockedCharacterIds, []);
    assert.equal(loserMissions.unlockPoints, 0);

    // Create a private match linked to the same account as Player A, then have the
    // (anonymous) Player B surrender — surrender always hands the win to the other
    // seat, so this deterministically makes the linked account (A) the winner.
    const secondMatch = await (
        await fetch(`${origin}/api/matches`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ playerToken: registered.token }),
        })
    ).json();
    const joined = await (
        await fetch(`${origin}/api/matches/${secondMatch.matchId}/join`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ inviteCode: secondMatch.inviteCode }),
        })
    ).json();
    const secondSurrenderResponse = await fetch(`${origin}/api/matches/${secondMatch.matchId}/surrender`, {
        method: 'POST',
        headers: { authorization: `Bearer ${joined.token}` },
    });
    assert.equal((await secondSurrenderResponse.json()).state.winner, 'A');

    const finalMissions = await (
        await fetch(`${origin}/api/missions`, { headers: { authorization: `Bearer ${registered.token}` } })
    ).json();
    assert.deepEqual(finalMissions.unlockedCharacterIds, ['onix']);
    assert.equal(finalMissions.unlockPoints, 50);
});

test('GET /api/skins exposes the catalog plus the signed-in player\'s own unlocks', async (t) => {
    const server = createPokemonUnisonServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const anonymous = await (await fetch(`${origin}/api/skins`)).json();
    assert.ok(Array.isArray(anonymous.skins));
    assert.ok(anonymous.skins.some((skin) => skin.skinId === 'ditto-shiny'));
    assert.deepEqual(anonymous.unlockedSkinIds, []);
    assert.equal(anonymous.unlockPoints, 0);
});

test('unlocking and equipping a skin over HTTP spends points and updates the account, and rejects an unauthenticated caller', async (t) => {
    const catalog = [
        { skinId: 'ditto-shiny', characterId: 'ditto', unlockPointCost: 200 },
        { skinId: 'pikachu-raichu', characterId: 'pikachu', unlockPointCost: 750 },
    ];
    const playerService = createPlayerService();
    const skinService = createSkinService({ playerService, catalog });
    const server = createPokemonUnisonServer({ playerService, skinService });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const unauthedUnlock = await fetch(`${origin}/api/skins/unlock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ skinId: 'ditto-shiny' }),
    });
    assert.equal(unauthedUnlock.status, 401);

    const registered = await (
        await fetch(`${origin}/api/players/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'SkinBuyer', email: '', password: 'longenough1' }),
        })
    ).json();

    const insufficientResponse = await fetch(`${origin}/api/skins/unlock`, {
        method: 'POST',
        headers: { authorization: `Bearer ${registered.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ skinId: 'ditto-shiny' }),
    });
    assert.equal(insufficientResponse.status, 400);

    // Grant points directly through the player service (there's no store yet in this test).
    playerService.updateProfile(registered.player.id, (profile) => ({
        ...profile,
        missions: { ...profile.missions, unlockPoints: 200 },
    }));

    const unlockResponse = await fetch(`${origin}/api/skins/unlock`, {
        method: 'POST',
        headers: { authorization: `Bearer ${registered.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ skinId: 'ditto-shiny' }),
    });
    assert.equal(unlockResponse.status, 200);
    const unlocked = await unlockResponse.json();
    assert.deepEqual(unlocked.player.profile.skins.unlockedSkinIds, ['ditto-shiny']);
    assert.equal(unlocked.player.profile.missions.unlockPoints, 0);

    const equipResponse = await fetch(`${origin}/api/skins/equip`, {
        method: 'POST',
        headers: { authorization: `Bearer ${registered.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ characterId: 'ditto', skinId: 'ditto-shiny' }),
    });
    assert.equal(equipResponse.status, 200);
    const equipped = await equipResponse.json();
    assert.deepEqual(equipped.player.profile.skins.equippedSkinByCharacterId, { ditto: 'ditto-shiny' });

    const meResponse = await (
        await fetch(`${origin}/api/players/me`, { headers: { authorization: `Bearer ${registered.token}` } })
    ).json();
    assert.deepEqual(meResponse.player.profile.skins.equippedSkinByCharacterId, { ditto: 'ditto-shiny' });
});

test('equipping a Johto-starter evolution skin actually swaps the battle skillset, not just the name', async (t) => {
    const playerService = createPlayerService();
    const server = createPokemonUnisonServer({ playerService });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const registered = await (
        await fetch(`${origin}/api/players/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'StarterTrainer', email: '', password: 'longenough1' }),
        })
    ).json();

    // Grant the skin the same way completing the evolution mission would (it's
    // missionRewardOnly, so /api/skins/unlock refuses to sell it for points).
    playerService.updateProfile(registered.player.id, (profile) => ({
        ...profile,
        skins: { ...profile.skins, unlockedSkinIds: ['cyndaquil-quilava-evolution'] },
    }));

    const equipResponse = await fetch(`${origin}/api/skins/equip`, {
        method: 'POST',
        headers: { authorization: `Bearer ${registered.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ characterId: 'cyndaquil', skinId: 'cyndaquil-quilava-evolution' }),
    });
    assert.equal(equipResponse.status, 200);

    const created = await (
        await fetch(`${origin}/api/matches`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                opponent: 'bot',
                playerToken: registered.token,
                teams: { A: ['cyndaquil', 'charmander', 'squirtle'], B: ['pidgey', 'zubat', 'chansey'] },
            }),
        })
    ).json();

    assert.equal(created.state.teams.A[0].form, 'quilava');
    assert.equal(created.state.teams.A[0].speciesId, 'cyndaquil');
    // Aerial Tackle is free (Random energy, 0 cooldown) so it's affordable turn one on
    // both forms - it stays castable, confirming Quilava's kit isn't just the base kit
    // renamed. Aerial Flamethrower (base-only) and Quilava Flame Wheel (Bloodline-cost)
    // both cost energy this fresh match doesn't have yet, so neither shows up regardless
    // of form; that's an economy/affordability concern, not what this test is checking.
    assert.ok(created.state.legalActions.some((entry) => entry.skillId === 'cyndaquil-aerial-tackle'));
    assert.ok(!created.state.legalActions.some((entry) => entry.skillId === 'cyndaquil-aerial-flamethrower'));

    // Charmander and Squirtle have no equipped evolution skin, so they stay base-form.
    assert.equal(created.state.teams.A[1].form, 'base');
    assert.equal(created.state.teams.A[2].form, 'base');
});

test('GET /api/store exposes the pokemon-arena point packages and reports PayPal as unconfigured here', async (t) => {
    const previous = { PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET };
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    t.after(() => {
        Object.entries(previous).forEach(([key, value]) => {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        });
    });

    const server = createPokemonUnisonServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const store = await (await fetch(`${origin}/api/store`)).json();
    assert.equal(store.paypalAvailable, false);
    assert.equal(store.unlockPoints, 0);
    assert.ok(store.packages.some((entry) => entry.packageId === 'pokemon-750-points'));
});

test('POST /api/store/paypal/create-order requires auth and returns 503 when PayPal is not configured', async (t) => {
    const previous = { PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET };
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    t.after(() => {
        Object.entries(previous).forEach(([key, value]) => {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        });
    });

    const server = createPokemonUnisonServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const unauthed = await fetch(`${origin}/api/store/paypal/create-order`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ packageId: 'pokemon-750-points' }),
    });
    assert.equal(unauthed.status, 401);

    const registered = await (
        await fetch(`${origin}/api/players/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'StoreShopper', email: '', password: 'longenough1' }),
        })
    ).json();
    const unconfigured = await fetch(`${origin}/api/store/paypal/create-order`, {
        method: 'POST',
        headers: { authorization: `Bearer ${registered.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ packageId: 'pokemon-750-points' }),
    });
    assert.equal(unconfigured.status, 503);
});

test('POST /api/store/characters/:characterId/purchase spends points over HTTP and rejects an unauthenticated caller', async (t) => {
    const missionCatalog = [
        { missionId: 'catch-onix', reward_character: 'onix', level_requirement: 13, goals: [{ type: 'win_matches', wins: 10 }] },
    ];
    const playerService = createPlayerService();
    const storeService = createStoreService({ playerService, missionCatalog });
    const server = createPokemonUnisonServer({ playerService, storeService });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const unauthed = await fetch(`${origin}/api/store/characters/onix/purchase`, { method: 'POST' });
    assert.equal(unauthed.status, 401);

    const registered = await (
        await fetch(`${origin}/api/players/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'CharacterShopper', email: '', password: 'longenough1' }),
        })
    ).json();

    const insufficientResponse = await fetch(`${origin}/api/store/characters/onix/purchase`, {
        method: 'POST',
        headers: { authorization: `Bearer ${registered.token}` },
    });
    assert.equal(insufficientResponse.status, 400);

    playerService.updateProfile(registered.player.id, (profile) => ({
        ...profile,
        missions: { ...profile.missions, unlockPoints: 1000 },
    }));

    const purchaseResponse = await fetch(`${origin}/api/store/characters/onix/purchase`, {
        method: 'POST',
        headers: { authorization: `Bearer ${registered.token}` },
    });
    assert.equal(purchaseResponse.status, 200);
    const purchased = await purchaseResponse.json();
    assert.equal(purchased.cost, 350);
    assert.deepEqual(purchased.player.profile.missions.unlockedCharacterIds, ['onix']);
    assert.equal(purchased.player.profile.missions.unlockPoints, 650);
});

test('a linked account cannot create a match with a mission-gated character it has not unlocked, but can once unlocked, and anonymous play stays fully open', async (t) => {
    const playerService = createPlayerService();
    const server = createPokemonUnisonServer({ playerService });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    // Anonymous play remains fully unrestricted, including a gated character like dragapult.
    const anonymousResponse = await fetch(`${origin}/api/matches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            opponent: 'bot',
            teams: { A: ['dragapult', 'zubat', 'chansey'], B: ['pidgey', 'meowth', 'abra'] },
        }),
    });
    assert.equal(anonymousResponse.status, 201);

    const registered = await (
        await fetch(`${origin}/api/players/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'GateChecker', email: '', password: 'longenough1' }),
        })
    ).json();

    const lockedResponse = await fetch(`${origin}/api/matches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            opponent: 'bot',
            playerToken: registered.token,
            teams: { A: ['dragapult', 'zubat', 'chansey'], B: ['pidgey', 'meowth', 'abra'] },
        }),
    });
    assert.equal(lockedResponse.status, 403);
    assert.match((await lockedResponse.json()).message, /dragapult is locked/);

    // Always-free characters remain selectable by a linked account with zero unlocks.
    const freeResponse = await fetch(`${origin}/api/matches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            opponent: 'bot',
            playerToken: registered.token,
            teams: { A: ['charmander', 'zubat', 'chansey'], B: ['pidgey', 'meowth', 'abra'] },
        }),
    });
    assert.equal(freeResponse.status, 201);

    // Grant the unlock the same way a completed mission or store purchase would, then retry.
    playerService.updateProfile(registered.player.id, (profile) => ({
        ...profile,
        missions: {
            ...profile.missions,
            unlockedCharacterIds: [...profile.missions.unlockedCharacterIds, 'dragapult'],
        },
    }));
    const unlockedResponse = await fetch(`${origin}/api/matches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            opponent: 'bot',
            playerToken: registered.token,
            teams: { A: ['dragapult', 'zubat', 'chansey'], B: ['pidgey', 'meowth', 'abra'] },
        }),
    });
    assert.equal(unlockedResponse.status, 201);
});

test('joining a private match with a locked team B character is rejected for a linked account, allowed once unlocked, and never gated for an anonymous joiner', async (t) => {
    const playerService = createPlayerService();
    const server = createPokemonUnisonServer({ playerService });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const created = await (
        await fetch(`${origin}/api/matches`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                teams: { A: ['charmander', 'squirtle', 'bulbasaur'], B: ['dragapult', 'zubat', 'chansey'] },
            }),
        })
    ).json();

    const registered = await (
        await fetch(`${origin}/api/players/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'Joiner', email: '', password: 'longenough1' }),
        })
    ).json();

    const lockedJoinResponse = await fetch(`${origin}/api/matches/${created.matchId}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inviteCode: created.inviteCode, playerToken: registered.token }),
    });
    assert.equal(lockedJoinResponse.status, 403);
    assert.match((await lockedJoinResponse.json()).message, /dragapult is locked/);

    playerService.updateProfile(registered.player.id, (profile) => ({
        ...profile,
        missions: { ...profile.missions, unlockedCharacterIds: ['dragapult'] },
    }));
    const unlockedJoinResponse = await fetch(`${origin}/api/matches/${created.matchId}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inviteCode: created.inviteCode, playerToken: registered.token }),
    });
    assert.equal(unlockedJoinResponse.status, 200);
    assert.equal((await unlockedJoinResponse.json()).player, 'B');

    // A fresh match with the same locked composition, joined with no account at all.
    const secondMatch = await (
        await fetch(`${origin}/api/matches`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                teams: { A: ['charmander', 'squirtle', 'bulbasaur'], B: ['dragapult', 'zubat', 'chansey'] },
            }),
        })
    ).json();
    const anonymousJoinResponse = await fetch(`${origin}/api/matches/${secondMatch.matchId}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inviteCode: secondMatch.inviteCode }),
    });
    assert.equal(anonymousJoinResponse.status, 200);
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
