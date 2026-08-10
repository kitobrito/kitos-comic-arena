'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    app,
    buildBattleProfileSnapshot,
    ensureMatchTurnData,
    getBattleBotActionDelayRange,
    isPrivateStaticSourcePath,
    persistMatchState,
    rewriteMirroredExternalImageUrls,
    serializeMatchPlayerForViewer,
    setPersistenceCollectionsForTests,
} = require('../server');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const battleClient = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const charactersSource = fs.readFileSync(path.join(root, 'characters.js'), 'utf8');
const externalImageRewrite = fs.readFileSync(
    path.join(root, 'scripts', 'rewrite-external-image-urls.js'),
    'utf8'
);

test('private backend and deployment sources cannot be served by the root static mount', () => {
    [
        '/server.js',
        '/battleLogic.js',
        '/passwordHashing.js',
        '/matchStability.js',
        '/pokemonTypeSystem.js',
        '/package.json',
        '/package-lock.json',
        '/render.yaml',
        '/sync_pokemon_ditto_release.js',
        '/test/match-stability.test.js',
        '/.env.new.save',
    ].forEach((requestPath) => {
        assert.equal(isPrivateStaticSourcePath(requestPath), true, requestPath);
    });

    [
        '/index.html',
        '/ingame.html',
        '/characters.js',
        '/pokemonDittoTransformationFaces.js',
        '/pokemon-wave-2-live.js',
        '/scripts/script.js',
        '/styles/style.css',
        '/assets/images/avatar.png',
    ].forEach((requestPath) => {
        assert.equal(isPrivateStaticSourcePath(requestPath), false, requestPath);
    });
});

test('the real Express stack returns 404 for backend sources while public game assets still load', async (t) => {
    const listener = await new Promise((resolve, reject) => {
        const candidate = app.listen(0, '127.0.0.1', () => resolve(candidate));
        candidate.once('error', reject);
    });
    t.after(
        () =>
            new Promise((resolve) => {
                listener.close(resolve);
            })
    );
    const address = listener.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    for (const requestPath of ['/server.js', '/battleLogic.js', '/package-lock.json']) {
        const response = await fetch(`${baseUrl}${requestPath}`);
        assert.equal(response.status, 404, requestPath);
    }
    for (const requestPath of ['/index.html', '/scripts/script.js', '/styles/style.css']) {
        const response = await fetch(`${baseUrl}${requestPath}`);
        assert.equal(response.status, 200, requestPath);
    }
    const compressedScript = await fetch(`${baseUrl}/scripts/script.js`, {
        headers: { 'Accept-Encoding': 'gzip' },
    });
    assert.equal(compressedScript.status, 200);
    assert.equal(compressedScript.headers.get('content-encoding'), 'gzip');
});

test('the generated character payload is compact, cached in memory, and revalidated by ETag', async (t) => {
    const listener = await new Promise((resolve, reject) => {
        const candidate = app.listen(0, '127.0.0.1', () => resolve(candidate));
        candidate.once('error', reject);
    });
    t.after(
        () =>
            new Promise((resolve) => {
                listener.close(resolve);
            })
    );
    const address = listener.address();
    const url = `http://127.0.0.1:${address.port}/characters.js`;
    const first = await fetch(url);
    assert.equal(first.status, 200);
    assert.match(first.headers.get('cache-control') || '', /must-revalidate/);
    const etag = first.headers.get('etag');
    assert.ok(etag);
    const payload = await first.text();
    assert.match(payload, /^const characters=\[/);
    assert.ok(payload.length < fs.statSync(path.join(root, 'characters.js')).size);

    const revalidated = await fetch(url, { headers: { 'If-None-Match': etag } });
    assert.equal(revalidated.status, 304);
    assert.equal(await revalidated.text(), '');
});

test('the live roster uses mirrored images and the rewrite tool discovers regenerated references', () => {
    assert.doesNotMatch(charactersSource, /https?:\/\/i\.imgur\.com\//);
    assert.match(externalImageRewrite, /discover every/);
    assert.match(externalImageRewrite, /source\.includes\(externalUrl\)/);

    const manifest = JSON.parse(
        fs.readFileSync(
            path.join(root, 'assets', 'images', 'external-mirror', 'manifest.json'),
            'utf8'
        )
    );
    const externalUrl = Object.keys(manifest).find((url) => url.includes('i.imgur.com'));
    const rewritten = rewriteMirroredExternalImageUrls({
        facePicture: externalUrl,
        nested: [{ skillimage: externalUrl }],
        description: 'unchanged',
    });
    const expectedLocalUrl = `/${manifest[externalUrl].localPath.replaceAll('\\', '/')}`;
    assert.equal(rewritten.facePicture, expectedLocalUrl);
    assert.equal(rewritten.nested[0].skillimage, expectedLocalUrl);
    assert.equal(rewritten.description, 'unchanged');
});

test('match broadcasts are read-only and do not create empty socket rooms', () => {
    const start = server.indexOf('const broadcastMatchState = async');
    const end = server.indexOf('const queueMatchStateBroadcast', start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const implementation = server.slice(start, end);
    assert.doesNotMatch(implementation, /ensureMatch|autoAdvanceTurnIfExpired|persistMatchState/);
    assert.match(implementation, /matchSocketRooms\.get\(match\.matchId\)/);
    assert.doesNotMatch(implementation, /getMatchRoom\(match\.matchId\)/);
});

test('authoritative match document writes use the revision-controlled persistence path', () => {
    const directWrites = server.match(/matchesCollection\.updateOne\(/g) || [];
    assert.equal(directWrites.length, 1);
    assert.match(server, /const persistMatchState = async/);
    assert.match(server, /stateRevision: nextRevision/);
    assert.match(server, /throw new MatchRevisionConflictError\(\)/);
});

test('revision-controlled persistence rejects a stale concurrent match writer', async (t) => {
    const stored = {
        matchId: 'cas-match',
        status: 'active',
        stateRevision: 4,
        turnNumber: 2,
        currentTurn: 'Alpha',
        players: [{ username: 'Alpha' }, { username: 'Beta' }],
    };
    const matches = {
        async updateOne(filter, update) {
            const expectedRevision = Number(filter.stateRevision);
            if (expectedRevision !== stored.stateRevision) {
                return { matchedCount: 0 };
            }
            Object.assign(stored, structuredClone(update.$set));
            return { matchedCount: 1 };
        },
    };
    setPersistenceCollectionsForTests({ matches });
    t.after(() => setPersistenceCollectionsForTests());

    const fresh = structuredClone(stored);
    const stale = structuredClone(stored);
    await persistMatchState(fresh, { currentTurn: 'Beta' }, { incrementTurn: true });
    assert.equal(stored.stateRevision, 5);
    assert.equal(stored.turnNumber, 3);
    assert.equal(stored.currentTurn, 'Beta');
    await assert.rejects(
        persistMatchState(stale, { currentTurn: 'Alpha' }),
        (error) => error?.code === 'MATCH_REVISION_CONFLICT'
    );
    assert.equal(stored.stateRevision, 5);
    assert.equal(stored.currentTurn, 'Beta');
});

test('revision conflicts are explicitly marked stale for client recovery', () => {
    const start = server.indexOf('const respondWithRevisionConflict');
    const end = server.indexOf('const isMatchRevisionConflict', start);
    const implementation = server.slice(start, end);
    assert.match(implementation, /staleAction: true/);
    assert.match(implementation, /actionRejected: 'revision-conflict'/);
});

test('ended-match hydration is behaviorally read-only and never recreates a turn', async (t) => {
    let writeCount = 0;
    setPersistenceCollectionsForTests({
        matches: {
            async updateOne() {
                writeCount += 1;
                return { matchedCount: 1 };
            },
        },
    });
    t.after(() => setPersistenceCollectionsForTests());
    const ended = {
        matchId: 'ended-match',
        status: 'ended',
        stateRevision: 9,
        turnNumber: 7,
        currentTurn: null,
        players: [{ username: 'Alpha' }, { username: 'Beta' }],
    };
    const hydrated = await ensureMatchTurnData(ended);
    assert.equal(hydrated.currentTurn, null);
    assert.equal(writeCount, 0);
});

test('ended matches persist before rewards are applied and cannot regain a live turn', () => {
    const finalizeStart = server.indexOf('const finalizeTurn = async');
    const finalizeEnd = server.indexOf('const autoAdvanceTurnIfExpired', finalizeStart);
    const finalizeSource = server.slice(finalizeStart, finalizeEnd);
    const firstEndedPersist = finalizeSource.indexOf('await persistMatchState(');
    const firstRewardApply = finalizeSource.indexOf('await applyRewardsToPersistedMatch(match)');
    assert.ok(firstEndedPersist >= 0);
    assert.ok(firstRewardApply > firstEndedPersist);
    assert.match(server, /if \(!match \|\| match\.status === 'ended' \|\| match\.currentTurn\)/);
    assert.match(server, /if \(!match \|\| match\.status === 'ended' \|\| !match\.turnExpiresAt\)/);
    assert.match(server, /rewardsAppliedAt/);
});

test('battle timer uses a smoothed server clock and submits inside the expiry grace window', () => {
    assert.match(battleClient, /let serverClockOffsetMs = 0/);
    assert.match(battleClient, /serverClockOffsetMs \* 0\.75 \+ sampleOffset \* 0\.25/);
    assert.match(battleClient, /turnExpiresAtMs - getEstimatedServerNow\(\)/);
    assert.match(battleClient, /remaining <= 750/);
    assert.match(server, /const TURN_EXPIRY_GRACE_MS = 3 \* 1000/);
    assert.match(server, /Date\.now\(\) <= expiry \+ TURN_EXPIRY_GRACE_MS/);
});

test('confirmed turn state applies immediately while skill trails continue as non-blocking overlays', () => {
    const start = battleClient.indexOf('const applyMatchStateAfterResolutionSequence');
    const end = battleClient.indexOf('const reorderQueuedSkills', start);
    const implementation = battleClient.slice(start, end);
    assert.match(implementation, /playQueuedResolutionSequence\(entries\)\.catch/);
    assert.match(implementation, /applyMatchState\(data\)/);
    assert.doesNotMatch(implementation, /await playQueuedResolutionSequence/);
    assert.doesNotMatch(battleClient, /waitForMs\(420\)/);
    assert.doesNotMatch(battleClient, /deferredResolutionMatchState/);
    assert.doesNotMatch(battleClient, /isPlayingResolutionSequence/);
});

test('explicit PvE bots act promptly while matchmaking bots retain humanized pacing', () => {
    assert.deepEqual(
        getBattleBotActionDelayRange({
            mode: 'pve',
            specialPveMissionId: 'mission-one',
        }),
        { minMs: 800, maxMs: 2000 }
    );
    assert.deepEqual(
        getBattleBotActionDelayRange({
            mode: 'quick',
            botMatch: { enabled: true },
        }),
        { minMs: 15000, maxMs: 40000 }
    );
});

test('recurring match profiles omit duplicated arena trees while retaining battle identity and skins', () => {
    const player = serializeMatchPlayerForViewer(
        {
            username: 'Alpha',
            profile: {
                avatarUrl: '/avatar.png',
                clan: { abbreviation: 'ABC' },
                ladder: { level: 2, rank: 'Academy Student' },
                skins: {
                    unlockedSkinIds: ['ditto-shiny'],
                    equippedSkinByCharacterId: { ditto: 'ditto-shiny' },
                },
                arenas: {
                    pokemon: {
                        avatarUrl: '/pokemon-avatar.png',
                        clan: { abbreviation: 'PKM' },
                        ladder: { level: 4, rank: 'Chunin' },
                        skins: {
                            unlockedSkinIds: ['ditto-shiny'],
                            equippedSkinByCharacterId: { ditto: 'ditto-shiny' },
                        },
                    },
                },
            },
        },
        'pokemon',
        []
    );
    assert.equal(player.profile.arenas, undefined);
    assert.equal(player.profile.avatarUrl, '/avatar.png');
    assert.equal(player.profile.skins.equippedSkinByCharacterId.ditto, 'ditto-shiny');
});

test('new match documents retain only battle-visible profile fields', () => {
    const snapshot = buildBattleProfileSnapshot(
        {
            avatarUrl: '/avatar.png',
            clan: { name: 'Clan', abbreviation: 'CLN', experiencePoints: 999 },
            ladder: { level: 7, rank: 'Chunin', wins: 50, recentGames: ['large'] },
            missions: { completedMissionIds: ['mission-one'] },
            recentLadderGames: [{ opponentUsername: 'Beta' }],
            arenas: {
                pokemon: {
                    ladder: { level: 7, rank: 'Chunin', wins: 50, recentGames: ['large'] },
                    missions: { completedMissionIds: ['mission-one'] },
                    recentLadderGames: [{ opponentUsername: 'Beta' }],
                    skins: {
                        unlockedSkinIds: ['ditto-shiny'],
                        equippedSkinByCharacterId: { ditto: 'ditto-shiny' },
                    },
                },
            },
        },
        'pokemon'
    );
    assert.equal(snapshot.battleSnapshotVersion, 1);
    assert.equal(snapshot.avatarUrl, '/avatar.png');
    assert.equal(snapshot.ladder.level, 7);
    assert.equal(snapshot.skins.equippedSkinByCharacterId.ditto, 'ditto-shiny');
    assert.equal(snapshot.missions, undefined);
    assert.equal(snapshot.recentLadderGames, undefined);
    assert.equal(snapshot.ladder.wins, undefined);
    assert.equal(snapshot.clan.experiencePoints, undefined);
});

test('transport, database, and fatal-error safeguards are explicitly bounded', () => {
    assert.ok(
        server.indexOf('app.use(compression())') < server.indexOf("app.get('/characters.js'"),
        'compression must wrap large static and generated responses'
    );
    assert.match(server, /perMessageDeflate:\s*\{/);
    assert.match(server, /threshold: 1024/);
    assert.match(server, /maxPoolSize: 15/);
    assert.match(server, /serverSelectionTimeoutMS: 8000/);
    assert.match(server, /socketTimeoutMS: 45000/);
    assert.match(server, /new MongoClient\(DEFAULT_URI, MONGO_CLIENT_OPTIONS\)/);
    assert.match(server, /mongoClient\.on\('serverHeartbeatFailed'/);
    assert.match(server, /usersCollection\.bulkWrite\(profileUpdates, \{ ordered: false \}\)/);
    assert.match(server, /usersCollection\.bulkWrite\(updates, \{ ordered: false \}\)/);
    assert.match(server, /process\.on\('unhandledRejection'/);
    assert.match(server, /process\.once\('uncaughtException'/);
    assert.match(server, /STARTUP_MIGRATION_VERSION = '2026-07-29-audit-remediation-v1'/);
    assert.match(server, /startupMigrationState\?\.version !== STARTUP_MIGRATION_VERSION/);
    assert.match(server, /matchesCollection\.createIndex\(\{ arena: 1 \}\)/);
    assert.match(server, /\{ \$project: \{ winner: 1, 'players\.username': 1, 'players\.team': 1 \} \}/);
    assert.match(server, /\$group:\s*\{\s*_id: '\$characterIndex'/);
});

test('match status hydration and expiry sweeps share the per-match command lane', () => {
    assert.match(server, /const hydrateMatchForStatus = \(matchId\) =>\s*matchCommandCoordinator\.execute/);
    assert.match(server, /status: 'active',\s*turnExpiresAt: \{ \$lte: now \}/);
    assert.match(server, /\.limit\(TURN_SWEEP_BATCH_SIZE\)/);
    assert.match(server, /Promise\.allSettled/);
    assert.match(server, /retireAbandonedActiveMatches/);
    assert.match(server, /if \(!matchesCollection \|\| turnSweepInFlight\) return/);
    assert.match(server, /advanceExpiredMatchAndBroadcast\(matchId\)/);
});

test('activity heartbeat only updates activity fields and cannot overwrite profile progress', () => {
    const start = server.indexOf("app.post('/api/activity'");
    const end = server.indexOf("app.get('/api/admin/winrates'", start);
    const route = server.slice(start, end);
    assert.match(route, /'profile\.activity\.lastOnlineAt'/);
    assert.match(route, /'profile\.activity\.currentPage'/);
    assert.doesNotMatch(route, /\$set:\s*\{\s*profile:/);
    assert.doesNotMatch(route, /normalizeUserProfile/);
});
