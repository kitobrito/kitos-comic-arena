const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeArenaMode,
    makeEmptyPendingTurn,
    buildMatchPayloadForUser,
    buildMatchActionStatePayload,
    areQueuedSkillRequestsEquivalent,
} = require('../server.js');

test('normalizeArenaMode keeps pokemon and falls back invalid values to comic', () => {
    assert.equal(normalizeArenaMode('pokemon'), 'pokemon');
    assert.equal(normalizeArenaMode('comic'), 'comic');
    assert.equal(normalizeArenaMode(' naruto '), 'comic');
    assert.equal(normalizeArenaMode(''), 'comic');
});

test('buildMatchPayloadForUser preserves pokemon arena and hides opponent cooldowns', () => {
    const pendingTurn = makeEmptyPendingTurn();
    pendingTurn.queueOrder = [0];
    pendingTurn.queuedByActorSlot = {
        '0': {
            actorSlot: 0,
            skillIndex: 1,
            targetSelection: [{ username: 'gary', slot: 0 }],
        },
    };

    const match = {
        matchId: 'match-test-1',
        mode: 'quick',
        arena: 'pokemon',
        status: 'active',
        currentTurn: 'ash',
        turnOrder: ['ash', 'gary'],
        turnStartedAt: new Date('2026-06-28T10:00:00.000Z'),
        turnExpiresAt: new Date('2026-06-28T10:01:00.000Z'),
        players: [
            {
                username: 'ash',
                team: [1, 2, 3],
                profile: {
                    avatarUrl: 'ash.png',
                    arenas: {
                        pokemon: {
                            ladder: { rank: 'Trainer', level: 8 },
                        },
                    },
                },
            },
            {
                username: 'gary',
                team: [4, 5, 6],
                profile: {
                    avatarUrl: 'gary.png',
                    arenas: {
                        pokemon: {
                            ladder: { rank: 'Rival', level: 9 },
                        },
                    },
                },
            },
        ],
        board: {
            ash: [
                {
                    slot: 0,
                    rosterIndex: 1,
                    alive: true,
                    hp: 85,
                    state: {
                        statuses: [],
                        cooldowns: { 'skill-a': 2 },
                        skillUses: { 'skill-a': 1 },
                    },
                },
            ],
            gary: [
                {
                    slot: 0,
                    rosterIndex: 4,
                    alive: true,
                    hp: 90,
                    state: {
                        statuses: [],
                        cooldowns: { 'secret-skill': 3 },
                        skillUses: { 'secret-skill': 1 },
                    },
                },
            ],
        },
        chakraPools: {
            ash: { taijutsu: 1, ninjutsu: 2, bloodline: 0, genjutsu: 1 },
            gary: { taijutsu: 9, ninjutsu: 9, bloodline: 9, genjutsu: 9 },
        },
        economy: {
            lastChakraGain: {
                ash: { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
                gary: { taijutsu: 1, ninjutsu: 1, bloodline: 1, genjutsu: 1 },
            },
        },
        pendingTurns: {
            ash: pendingTurn,
            gary: makeEmptyPendingTurn(),
        },
        ladderResults: null,
        backgroundOverride: 'assets/images/PokemonArena/newingamebgPA.png',
    };

    const payload = buildMatchPayloadForUser(match, 'ash');

    assert.equal(payload.arena, 'pokemon');
    assert.equal(payload.player.username, 'ash');
    assert.equal(payload.opponent.username, 'gary');
    assert.deepEqual(payload.chakraPools, {
        ash: { taijutsu: 1, ninjutsu: 2, bloodline: 0, genjutsu: 1 },
    });
    assert.deepEqual(payload.lastChakraGain, {
        ash: { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
    });
    assert.deepEqual(payload.pendingTurn.queueOrder, [0]);
    assert.deepEqual(payload.board.ash[0].state.cooldowns, { 'skill-a': 2 });
    assert.equal(payload.board.gary[0].state.cooldowns, undefined);
    assert.equal(payload.backgroundOverride, 'assets/images/PokemonArena/newingamebgPA.png');
});

test('buildMatchPayloadForUser resolves viewer-scoped energy with username case differences', () => {
    const match = {
        matchId: 'match-test-case-scope',
        mode: 'quick',
        arena: 'pokemon',
        status: 'active',
        currentTurn: 'ash',
        players: [
            { username: 'ash', team: [1, 2, 3], profile: {} },
            { username: 'gary', team: [4, 5, 6], profile: {} },
        ],
        board: {
            ash: [{ slot: 0, rosterIndex: 1, alive: true, hp: 100, state: { statuses: [] } }],
            gary: [{ slot: 0, rosterIndex: 4, alive: true, hp: 100, state: { statuses: [] } }],
        },
        chakraPools: {
            ash: { taijutsu: 2, ninjutsu: 1, bloodline: 0, genjutsu: 3 },
        },
        economy: {
            lastChakraGain: {
                ash: { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
            },
        },
        pendingTurns: {
            ash: makeEmptyPendingTurn(),
            gary: makeEmptyPendingTurn(),
        },
        ladderResults: {
            ash: { ladderPointsDelta: 18, rating: 1210 },
        },
    };

    const payload = buildMatchPayloadForUser(match, 'Ash');

    assert.equal(payload.player.username, 'ash');
    assert.deepEqual(payload.chakraPools, {
        Ash: { taijutsu: 2, ninjutsu: 1, bloodline: 0, genjutsu: 3 },
    });
    assert.deepEqual(payload.lastChakraGain, {
        Ash: { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
    });
    assert.deepEqual(payload.ladderResult, { ladderPointsDelta: 18, rating: 1210 });
});
test('buildMatchActionStatePayload carries current safe state for stale actions', () => {
    const match = {
        matchId: 'match-test-2',
        mode: 'quick',
        arena: 'pokemon',
        status: 'ended',
        winner: 'misty',
        endReason: 'timeout',
        currentTurn: null,
        players: [
            { username: 'misty', team: [1, 2, 3], profile: {} },
            { username: 'brock', team: [4, 5, 6], profile: {} },
        ],
        board: {
            misty: [{ slot: 0, rosterIndex: 1, alive: true, hp: 100, state: { statuses: [] } }],
            brock: [{ slot: 0, rosterIndex: 4, alive: false, hp: 0, state: { statuses: [] } }],
        },
        chakraPools: {
            misty: { taijutsu: 2, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
            brock: { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 },
        },
        pendingTurns: {
            misty: makeEmptyPendingTurn(),
            brock: makeEmptyPendingTurn(),
        },
    };

    const payload = buildMatchActionStatePayload(match, 'misty', {
        actionRejected: 'match-ended',
    });

    assert.equal(payload.ok, true);
    assert.equal(payload.staleAction, true);
    assert.equal(payload.actionRejected, 'match-ended');
    assert.equal(payload.status, 'ended');
    assert.equal(payload.arena, 'pokemon');
    assert.equal(payload.player.username, 'misty');
    assert.equal(payload.opponent.username, 'brock');
    assert.deepEqual(payload.chakraPools, {
        misty: { taijutsu: 2, ninjutsu: 1, bloodline: 0, genjutsu: 0 },
    });
});

test('areQueuedSkillRequestsEquivalent matches repeated queue submissions', () => {
    const existing = {
        actorSlot: 1,
        skillIndex: 2,
        classChoice: 'energy',
        absorptionChoice: 'negative',
        targetSelection: [{ username: 'Gary ', slot: '1' }, { username: 'ash', slot: 0 }],
    };

    assert.equal(
        areQueuedSkillRequestsEquivalent(existing, {
            skillIndex: 2,
            classChoice: ' Energy ',
            absorptionChoice: 'NEGATIVE',
            targetSelection: [{ username: 'ash', slot: 0 }, { username: 'gary', slot: 1 }],
        }),
        true
    );

    assert.equal(
        areQueuedSkillRequestsEquivalent(existing, {
            skillIndex: 2,
            classChoice: 'physical',
            absorptionChoice: 'negative',
            targetSelection: [{ username: 'ash', slot: 0 }, { username: 'gary', slot: 1 }],
        }),
        false
    );
});
