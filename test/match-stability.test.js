'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    assertMatchInvariants,
    createCoordinatedMatchHandler,
    createMatchCommandCoordinator,
    createSeededRandom,
    normalizeMatchVersionFields,
} = require('../matchStability');
const {
    adjustRandomAssignments,
    buildAbandonedActiveMatchFilter,
    buildMatchPayloadForUser,
} = require('../server');

const makeMatch = (arena = 'comic') => ({
    matchId: `stability-${arena}`,
    arena,
    mode: 'quick',
    status: 'active',
    stateRevision: 7,
    turnNumber: 3,
    currentTurn: 'Alpha',
    turnOrder: ['Alpha', 'Beta'],
    players: [
        { username: 'Alpha', team: [0], aliveCount: 1, profile: {} },
        { username: 'Beta', team: [1], aliveCount: 1, profile: {} },
    ],
    board: {
        Alpha: [{ slot: 0, rosterIndex: 0, hp: 100, alive: true, state: { statuses: [], cooldowns: {} } }],
        Beta: [{ slot: 0, rosterIndex: 1, hp: 100, alive: true, state: { statuses: [], cooldowns: {} } }],
    },
    chakraPools: {
        Alpha: { taijutsu: 1, ninjutsu: 1, bloodline: 1, genjutsu: 1 },
        Beta: { taijutsu: 1, ninjutsu: 1, bloodline: 1, genjutsu: 1 },
    },
    pendingTurns: {
        Alpha: { queuedByActorSlot: {}, queueOrder: [], unresolvedRandom: 0, randomAssignments: {} },
        Beta: { queuedByActorSlot: {}, queueOrder: [], unresolvedRandom: 0, randomAssignments: {} },
    },
});

test('match command coordinator serializes queue, cancel, and end-turn work for one match', async () => {
    const coordinator = createMatchCommandCoordinator({ logger: {} });
    const state = { queued: [], ended: false, endCount: 0 };
    const observed = [];
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    await Promise.all([
        coordinator.execute('shared-match', 'queue', async () => {
            observed.push('queue:start');
            await delay(15);
            state.queued.push(0);
            observed.push('queue:end');
        }),
        coordinator.execute('shared-match', 'cancel', async () => {
            observed.push('cancel:start');
            state.queued = state.queued.filter((slot) => slot !== 0);
            observed.push('cancel:end');
        }),
        coordinator.execute('shared-match', 'end-turn', async () => {
            observed.push('end:start');
            if (!state.ended) {
                state.ended = true;
                state.endCount += 1;
            }
            observed.push('end:end');
        }),
        coordinator.execute('shared-match', 'timeout', async () => {
            if (!state.ended) {
                state.ended = true;
                state.endCount += 1;
            }
        }),
    ]);

    assert.deepEqual(observed, [
        'queue:start',
        'queue:end',
        'cancel:start',
        'cancel:end',
        'end:start',
        'end:end',
    ]);
    assert.deepEqual(state.queued, []);
    assert.equal(state.endCount, 1);
    assert.equal(coordinator.getActiveLaneCount(), 0);
});

test('match command coordinator allows unrelated matches to progress independently', async () => {
    const coordinator = createMatchCommandCoordinator({ logger: {} });
    let releaseFirst;
    const gate = new Promise((resolve) => {
        releaseFirst = resolve;
    });
    let secondCompleted = false;
    const first = coordinator.execute('match-a', 'slow-command', () => gate);
    const second = coordinator.execute('match-b', 'fast-command', async () => {
        secondCompleted = true;
    });
    await second;
    assert.equal(secondCompleted, true);
    releaseFirst();
    await first;
});

test('coordinated route holds its match lane until database work finishes after a client disconnect', async () => {
    const coordinator = createMatchCommandCoordinator({ logger: {} });
    let finishHandler;
    const handlerGate = new Promise((resolve) => {
        finishHandler = resolve;
    });
    const response = new EventEmitter();
    const observed = [];
    const coordinated = createCoordinatedMatchHandler({
        coordinator,
        handler: async () => {
            observed.push('request:start');
            await handlerGate;
            observed.push('request:database-finished');
        },
        log: false,
    });

    const request = coordinated(
        { method: 'POST', path: '/turn/random/adjust', params: { matchId: 'shared-match' } },
        response,
        (error) => {
            throw error;
        }
    );
    await new Promise((resolve) => setImmediate(resolve));
    response.emit('close');
    const nextCommand = coordinator.execute('shared-match', 'next-command', async () => {
        observed.push('next:start');
    }, { log: false });
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(observed, ['request:start']);
    finishHandler();
    await Promise.all([request, nextCommand]);
    assert.deepEqual(observed, ['request:start', 'request:database-finished', 'next:start']);
    assert.equal(coordinator.getActiveLaneCount(), 0);
});

test('match invariants accept both arenas and reject invalid mutable state', () => {
    const chakraTypes = ['taijutsu', 'ninjutsu', 'bloodline', 'genjutsu'];
    assert.equal(assertMatchInvariants(makeMatch('comic'), { chakraTypes }), true);
    assert.equal(assertMatchInvariants(makeMatch('pokemon'), { chakraTypes }), true);

    const duplicateQueue = makeMatch('pokemon');
    duplicateQueue.pendingTurns.Alpha.queueOrder = [0, 0];
    assert.throws(
        () => assertMatchInvariants(duplicateQueue, { chakraTypes }),
        /Duplicate queued actor/
    );

    const negativeEnergy = makeMatch('comic');
    negativeEnergy.chakraPools.Alpha.taijutsu = -1;
    assert.throws(
        () => assertMatchInvariants(negativeEnergy, { chakraTypes }),
        /Invalid taijutsu chakra/
    );
});

test('seeded battle random provider reproduces identical sequences', () => {
    const left = createSeededRandom(8675309);
    const right = createSeededRandom(8675309);
    assert.deepEqual(
        Array.from({ length: 20 }, () => left()),
        Array.from({ length: 20 }, () => right())
    );
});

test('authoritative match payload includes additive revision metadata', () => {
    const match = makeMatch('pokemon');
    const payload = buildMatchPayloadForUser(match, 'Alpha');
    assert.equal(payload.stateRevision, 7);
    assert.equal(payload.turnNumber, 3);
    assert.equal(typeof payload.serverTime, 'string');
    assert.equal(Number.isNaN(Date.parse(payload.serverTime)), false);

    const legacy = makeMatch('comic');
    delete legacy.stateRevision;
    delete legacy.turnNumber;
    normalizeMatchVersionFields(legacy);
    assert.equal(legacy.stateRevision, 0);
    assert.equal(legacy.turnNumber, 0);
});

test('battle client orders mutations and ignores older authoritative snapshots', () => {
    const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'script.js'), 'utf8');
    assert.match(script, /matchCommandRequestChain\s*\.catch\(\(\) => \{\}\)\s*\.then\(run\)/);
    assert.match(script, /expectedRevision: lastAppliedMatchRevision/);
    assert.match(script, /revision < lastAppliedMatchRevision/);
    assert.match(script, /incomingRevision >= pendingRevision/);
    assert.match(script, /X-Match-State-Revision/);
});

test('random chakra adjustments can be committed as one atomic batch', () => {
    const match = makeMatch('pokemon');
    match.pendingTurns.Alpha.unresolvedRandom = 2;
    adjustRandomAssignments({
        match,
        username: 'Alpha',
        adjustments: [
            { chakraType: 'taijutsu', delta: 1 },
            { chakraType: 'ninjutsu', delta: 1 },
        ],
    });
    assert.deepEqual(match.chakraPools.Alpha, {
        taijutsu: 0,
        ninjutsu: 0,
        bloodline: 1,
        genjutsu: 1,
    });
    assert.equal(match.pendingTurns.Alpha.unresolvedRandom, 0);
    assert.deepEqual(match.pendingTurns.Alpha.randomAssignments, {
        taijutsu: 1,
        ninjutsu: 1,
        bloodline: 0,
        genjutsu: 0,
    });
});

test('an invalid random chakra batch leaves the authoritative pool unchanged', () => {
    const match = makeMatch('pokemon');
    match.pendingTurns.Alpha.unresolvedRandom = 1;
    const originalPool = structuredClone(match.chakraPools.Alpha);
    const originalPending = structuredClone(match.pendingTurns.Alpha);
    assert.throws(() => adjustRandomAssignments({
        match,
        username: 'Alpha',
        adjustments: [
            { chakraType: 'taijutsu', delta: 1 },
            { chakraType: 'taijutsu', delta: 1 },
        ],
    }), /No unresolved random chakra/);
    assert.deepEqual(match.chakraPools.Alpha, originalPool);
    assert.deepEqual(match.pendingTurns.Alpha, originalPending);
});

test('battle client coalesces rapid random chakra changes before committing', () => {
    const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'script.js'), 'utf8');
    assert.match(script, /pendingRandomChakraAdjustments\.push\(\{ chakraType, delta \}\)/);
    assert.match(script, /body: JSON\.stringify\(\{ adjustments \}\)/);
    assert.match(script, /window\.setTimeout\(\s*flushRandomChakraAdjustmentBatch,\s*160/);
    assert.doesNotMatch(script, /controller\.abort\(\), 7000/);
});

test('match routes serialize the full async handler instead of releasing on socket close', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const middlewareIndex = server.indexOf("app.use('/api/match/:matchId'");
    assert.notEqual(middlewareIndex, -1);
    assert.doesNotMatch(server.slice(middlewareIndex, middlewareIndex + 1800), /res\.once\('close'/);
    assert.match(server, /const withMatchCommand = \(handler, options = \{\}\)/);
    [
        "app.get('/api/match/:matchId', requireSession, withMatchCommand(",
        "app.post('/api/match/:matchId/turn/end', requireSession, withMatchCommand(",
        "app.post('/api/match/:matchId/skill/queue', requireSession, withMatchCommand(",
        "app.post('/api/match/:matchId/skill/cancel', requireSession, withMatchCommand(",
        "app.post('/api/match/:matchId/skill/reorder', requireSession, withMatchCommand(",
        "app.post('/api/match/:matchId/turn/random/adjust', requireSession, withMatchCommand(",
        "app.post('/api/match/:matchId/chakra/exchange', requireSession, withMatchCommand(",
        "app.post('/api/match/:matchId/skill/targets', requireSession, withMatchCommand(",
    ].forEach((route) => {
        const routeIndex = server.indexOf(route);
        assert.notEqual(routeIndex, -1, route);
        assert.ok(routeIndex > middlewareIndex, `${route} should run behind serialized middleware`);
    });
});

test('database recovery promptly retires only abandoned active matches', () => {
    const now = new Date('2026-08-09T20:00:00.000Z');
    assert.deepEqual(buildAbandonedActiveMatchFilter(now), {
        status: 'active',
        $or: [
            { turnExpiresAt: { $lte: new Date('2026-08-09T19:58:00.000Z') } },
            {
                currentTurn: { $in: [null, ''] },
                createdAt: { $lte: new Date('2026-08-09T19:58:00.000Z') },
            },
        ],
    });
});

test('MongoDB operations are bounded so a stalled write cannot hold a match lane forever', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const client = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'script.js'), 'utf8');
    assert.match(server, /const MONGO_CLIENT_OPTIONS = Object\.freeze\(\{[\s\S]*?timeoutMS:\s*6 \* 1000/);
    assert.match(client, /const MATCH_COMMAND_TIMEOUT_MS = 12000/);
});

test('version polling advances expired turns and abandoned cleanup is independent of the turn sweep', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const versionStart = server.indexOf("app.get('/api/match/:matchId/version'");
    const versionEnd = server.indexOf("app.get('/api/match/:matchId'", versionStart + 1);
    assert.notEqual(versionStart, -1);
    assert.notEqual(versionEnd, -1);
    assert.match(server.slice(versionStart, versionEnd), /hydrateAndAdvanceMatch\(matchId\)/);
    assert.match(server, /\.limit\(TURN_SWEEP_BATCH_SIZE\)/);
    assert.match(server, /Promise\.allSettled/);
    const sweepStart = server.indexOf('const sweepExpiredMatches = async () =>');
    const sweepEnd = server.indexOf('const attachWebSocketSupport', sweepStart);
    assert.doesNotMatch(server.slice(sweepStart, sweepEnd), /retireAbandonedActiveMatches/);
    assert.match(server, /abandonedMatchCleanupTimer = setInterval\(\(\) => \{\s*runAbandonedMatchCleanup/);
    assert.match(server, /status: healthy \? 'ok' : 'degraded'/);
});
