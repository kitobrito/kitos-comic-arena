'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    assertMatchInvariants,
    createMatchCommandCoordinator,
    createSeededRandom,
    normalizeMatchVersionFields,
} = require('../matchStability');
const { buildMatchPayloadForUser } = require('../server');

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
