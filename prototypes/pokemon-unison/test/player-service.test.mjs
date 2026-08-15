import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createPlayerService, PlayerServiceError } from '../reference/player-service.mjs';
import { createJsonPlayerStorage } from '../reference/player-storage.mjs';

test('registration creates a player with a default empty profile and a usable session token', async () => {
    const service = createPlayerService();
    const { player, token } = await service.register({
        username: 'Ashketchum',
        email: 'ash@example.com',
        password: 'pikachu-1',
    });

    assert.equal(player.username, 'Ashketchum');
    assert.equal(player.email, 'ash@example.com');
    assert.deepEqual(player.profile.missions, {
        progressByMissionId: {},
        unlockedCharacterIds: [],
        unlockPoints: 0,
        purchasedUnlocks: [],
    });
    assert.deepEqual(player.profile.skins, { unlockedSkinIds: [], equippedSkinByCharacterId: {} });

    const verified = service.verifySession(token);
    assert.equal(verified.id, player.id);
});

test('registration rejects invalid usernames, short passwords, and duplicate usernames (case-insensitive)', async () => {
    const service = createPlayerService();
    await assert.rejects(
        service.register({ username: 'ab', email: '', password: 'longenough1' }),
        (error) => error instanceof PlayerServiceError && error.code === 'invalid_username'
    );
    await assert.rejects(
        service.register({ username: 'validname', email: '', password: 'short' }),
        (error) => error instanceof PlayerServiceError && error.code === 'invalid_password'
    );

    await service.register({ username: 'Misty', email: '', password: 'longenough1' });
    await assert.rejects(
        service.register({ username: 'misty', email: '', password: 'longenough2' }),
        (error) => error instanceof PlayerServiceError && error.code === 'username_taken'
    );
});

test('login requires a matching password and is case-insensitive on username', async () => {
    const service = createPlayerService();
    await service.register({ username: 'Brock', email: '', password: 'rockthrow1' });

    await assert.rejects(
        service.login({ username: 'Brock', password: 'wrong-password' }),
        (error) => error instanceof PlayerServiceError && error.code === 'invalid_credentials'
    );
    await assert.rejects(
        service.login({ username: 'nobody', password: 'rockthrow1' }),
        (error) => error instanceof PlayerServiceError && error.code === 'invalid_credentials'
    );

    const { player, token } = await service.login({ username: 'BROCK', password: 'rockthrow1' });
    assert.equal(player.username, 'Brock');
    assert.ok(token);
});

test('logout revokes the session token immediately', async () => {
    const service = createPlayerService();
    const { token } = await service.register({ username: 'Gary', email: '', password: 'eevee-team1' });

    assert.ok(service.verifySession(token));
    service.logout(token);
    assert.equal(service.verifySession(token), null);
});

test('verifySession rejects malformed, unsigned, and expired-looking tokens', async () => {
    const service = createPlayerService();
    assert.equal(service.verifySession(''), null);
    assert.equal(service.verifySession('not-a-jwt'), null);
    assert.equal(service.verifySession('a.b.c'), null);

    const { token } = await service.register({ username: 'Erika', email: '', password: 'grass-type1' });
    const tamperedSignature = `${token.split('.').slice(0, 2).join('.')}.tampered`;
    assert.equal(service.verifySession(tamperedSignature), null);
});

test('file-backed players survive restart with a hashed (not plaintext) password', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'pokemon-unison-player-storage-'));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const firstService = createPlayerService({ storage: createJsonPlayerStorage(directory) });
    const { player, token } = await firstService.register({
        username: 'Lorelei',
        email: 'lorelei@example.com',
        password: 'ice-cold-99',
    });

    const files = (await readdir(directory)).filter(
        (name) => name.endsWith('.json') && name !== 'session-secret.json'
    );
    assert.deepEqual(files, [`${player.id}.json`]);
    const storedText = await readFile(join(directory, files[0]), 'utf8');
    assert.equal(storedText.includes('ice-cold-99'), false);
    assert.match(storedText, /"passwordHash": "scrypt:/);

    const restarted = createPlayerService({ storage: createJsonPlayerStorage(directory) });
    assert.equal(restarted.size(), 1);
    const verified = restarted.verifySession(token);
    assert.equal(verified.username, 'Lorelei');

    const loggedIn = await restarted.login({ username: 'Lorelei', password: 'ice-cold-99' });
    assert.equal(loggedIn.player.id, player.id);
    await assert.rejects(
        restarted.register({ username: 'lorelei', email: '', password: 'anotherpass1' }),
        (error) => error instanceof PlayerServiceError && error.code === 'username_taken'
    );
});

test('the session secret persists across restarts so old tokens keep verifying', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'pokemon-unison-player-secret-'));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const firstService = createPlayerService({ storage: createJsonPlayerStorage(directory) });
    const { token } = await firstService.register({ username: 'Agatha', email: '', password: 'ghost-type-1' });

    const restarted = createPlayerService({ storage: createJsonPlayerStorage(directory) });
    const verified = restarted.verifySession(token);
    assert.equal(verified.username, 'Agatha');
});

test('ensureBotPlayer creates an unauthenticatable player once, then no-ops on repeat calls', () => {
    const service = createPlayerService();
    const ladder = { level: 3, rank: 'Sparkstrike', experiencePoints: 500, wins: 8, losses: 6, streak: 2, highestStreak: 2, highestLevel: 3, ladderRank: null, isTopRank: false };

    const first = service.ensureBotPlayer({ username: 'TestBot', ladder });
    assert.equal(first.isBot, true);
    assert.deepEqual(first.profile.ladder, ladder);
    assert.equal(service.size(), 1);

    // A second call with the same username is a no-op, not a duplicate.
    const second = service.ensureBotPlayer({ username: 'TestBot', ladder: { ...ladder, wins: 999 } });
    assert.equal(second.id, first.id);
    assert.equal(second.profile.ladder.wins, 8, 'the original seeded stats are untouched by a repeat call');
    assert.equal(service.size(), 1);

    assert.equal(service.listAll().find((player) => player.username === 'TestBot')?.isBot, true);
});

test('ensureLinkedPlayer creates a passwordless player once, then reuses it on repeat calls with a fresh token', () => {
    const service = createPlayerService();

    const first = service.ensureLinkedPlayer({ accountId: 'real-account-1', username: 'AshKetchum' });
    assert.equal(first.player.username, 'AshKetchum');
    assert.ok(first.token);
    assert.equal(service.size(), 1);

    const second = service.ensureLinkedPlayer({ accountId: 'real-account-1', username: 'AshKetchum' });
    assert.equal(second.player.id, first.player.id);
    assert.notEqual(second.token, first.token, 'a fresh session token is issued on every bootstrap');
    assert.equal(service.size(), 1, 'the same real account never creates a second player');

    const verified = service.verifySession(second.token);
    assert.equal(verified.id, first.player.id);
});

test('ensureLinkedPlayer disambiguates a username already taken by a manually-registered player', async () => {
    const service = createPlayerService();
    await service.register({ username: 'Misty', email: '', password: 'longenough1' });

    const linked = service.ensureLinkedPlayer({ accountId: 'real-account-2', username: 'Misty' });
    assert.notEqual(linked.player.username, 'Misty');
    assert.match(linked.player.username, /^Misty\d+$/);
});

test('a different account id linking with no username falls back to a stable generated name', () => {
    const service = createPlayerService();
    const linked = service.ensureLinkedPlayer({ accountId: 'real-account-3', username: '' });
    assert.ok(linked.player.username.startsWith('Trainer'));
});
