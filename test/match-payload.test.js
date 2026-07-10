const test = require('node:test');
const assert = require('node:assert/strict');
const characters = require('../characters.js');

const {
    normalizeArenaMode,
    makeEmptyPendingTurn,
    sanitizeSavedTeamIndicesForArena,
    buildSanitizedSavedTeamIndicesByArena,
    serializeUserForClient,
    buildMatchPayloadForUser,
    buildMatchActionStatePayload,
    areQueuedSkillRequestsEquivalent,
    normalizeRecentLadderGames,
    countCurrentLadderSurrenderStreakByUser,
    isRepeatLadderSurrenderer,
    resolveExpiredTurnStartChoiceIfNeeded,
} = require('../server.js');

const firstComicRosterIndex = characters.findIndex(
    (character) => normalizeArenaMode(character?.arena || character?.universe) === 'comic'
);
const firstPokemonRosterIndex = characters.findIndex(
    (character) => normalizeArenaMode(character?.arena || character?.universe) === 'pokemon'
);

test('normalizeArenaMode keeps pokemon and falls back invalid values to comic', () => {
    assert.equal(normalizeArenaMode('pokemon'), 'pokemon');
    assert.equal(normalizeArenaMode('comic'), 'comic');
    assert.equal(normalizeArenaMode(' naruto '), 'comic');
    assert.equal(normalizeArenaMode(''), 'comic');
});

test('sanitizeSavedTeamIndicesForArena strips cross-arena, duplicate, and invalid slots', () => {
    assert.ok(firstComicRosterIndex >= 0);
    assert.ok(firstPokemonRosterIndex >= 0);

    assert.deepEqual(
        sanitizeSavedTeamIndicesForArena(
            [
                firstPokemonRosterIndex,
                firstComicRosterIndex,
                firstComicRosterIndex,
                firstPokemonRosterIndex + 1,
                -1,
            ],
            'comic'
        ),
        [firstComicRosterIndex]
    );

    assert.deepEqual(
        sanitizeSavedTeamIndicesForArena(
            [firstComicRosterIndex, firstPokemonRosterIndex, firstPokemonRosterIndex, 9999],
            'pokemon'
        ),
        [firstPokemonRosterIndex]
    );
});

test('serializeUserForClient keeps comic and pokemon saved teams isolated', () => {
    assert.ok(firstComicRosterIndex >= 0);
    assert.ok(firstPokemonRosterIndex >= 0);

    const serializedUser = serializeUserForClient({
        username: 'ArenaTester',
        savedTeamIndices: [firstPokemonRosterIndex, firstComicRosterIndex],
        savedTeamIndicesByArena: {
            comic: [firstPokemonRosterIndex, firstComicRosterIndex],
            pokemon: [firstComicRosterIndex, firstPokemonRosterIndex],
        },
        profile: {},
    });

    assert.deepEqual(serializedUser.savedTeamIndices, [firstComicRosterIndex]);
    assert.deepEqual(serializedUser.savedTeamIndicesByArena, {
        comic: [firstComicRosterIndex],
        pokemon: [firstPokemonRosterIndex],
    });
});

test('buildSanitizedSavedTeamIndicesByArena falls back legacy comic teams without leaking into pokemon', () => {
    assert.ok(firstComicRosterIndex >= 0);
    assert.ok(firstPokemonRosterIndex >= 0);

    const savedTeams = buildSanitizedSavedTeamIndicesByArena({
        savedTeamIndices: [firstComicRosterIndex, firstPokemonRosterIndex],
    });

    assert.deepEqual(savedTeams, {
        comic: [firstComicRosterIndex],
        pokemon: [],
    });
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
    assert.equal(payload.backgroundOverride, 'assets/images/PokemonArena/newbattlepic/1783150082785.png');
});

test('buildMatchPayloadForUser preserves status icon URLs for client passive icons', () => {
    const statusIconUrl = 'assets/images/ghostridermotorcycle.png';
    const match = {
        matchId: 'match-status-icon-url',
        mode: 'quick',
        arena: 'comic',
        status: 'active',
        currentTurn: 'ash',
        players: [
            { username: 'ash', team: [firstComicRosterIndex], profile: {} },
            { username: 'gary', team: [firstComicRosterIndex], profile: {} },
        ],
        board: {
            ash: [
                {
                    slot: 0,
                    rosterIndex: firstComicRosterIndex,
                    alive: true,
                    hp: 100,
                    state: {
                        statuses: [
                            {
                                id: 'comic_passive_status_icon',
                                remainingTurns: 99,
                                sourceSkillId: null,
                                metadata: {
                                    statusIconUrl,
                                    tooltipText: 'Passive tracker is active.',
                                },
                            },
                        ],
                        cooldowns: {},
                        skillUses: {},
                    },
                },
            ],
            gary: [
                {
                    slot: 0,
                    rosterIndex: firstComicRosterIndex,
                    alive: true,
                    hp: 100,
                    state: { statuses: [] },
                },
            ],
        },
        pendingTurns: {
            ash: makeEmptyPendingTurn(),
            gary: makeEmptyPendingTurn(),
        },
    };

    const payload = buildMatchPayloadForUser(match, 'ash');

    assert.equal(
        payload.board.ash[0].state.statuses[0].metadata.statusIconUrl,
        statusIconUrl
    );
});

test('buildMatchPayloadForUser rebuilds incomplete match teams from board state', () => {
    assert.ok(firstPokemonRosterIndex >= 0);
    const secondPokemonRosterIndex = characters.findIndex(
        (character, index) =>
            index !== firstPokemonRosterIndex &&
            normalizeArenaMode(character?.arena || character?.universe) === 'pokemon'
    );
    const thirdPokemonRosterIndex = characters.findIndex(
        (character, index) =>
            index !== firstPokemonRosterIndex &&
            index !== secondPokemonRosterIndex &&
            normalizeArenaMode(character?.arena || character?.universe) === 'pokemon'
    );
    assert.ok(secondPokemonRosterIndex >= 0);
    assert.ok(thirdPokemonRosterIndex >= 0);

    const payload = buildMatchPayloadForUser(
        {
            matchId: 'match-incomplete-team',
            arena: 'pokemon',
            mode: 'quick',
            status: 'active',
            currentTurn: 'ash',
            players: [
                {
                    username: 'ash',
                    team: [firstPokemonRosterIndex],
                    profile: {},
                },
                {
                    username: 'gary',
                    team: [firstPokemonRosterIndex],
                    profile: {},
                },
            ],
            board: {
                ash: [
                    { slot: 0, rosterIndex: firstPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                    { slot: 1, rosterIndex: secondPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                    { slot: 2, rosterIndex: thirdPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                ],
                gary: [
                    { slot: 0, rosterIndex: thirdPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                    { slot: 1, rosterIndex: secondPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                    { slot: 2, rosterIndex: firstPokemonRosterIndex, alive: true, hp: 100, state: { statuses: [] } },
                ],
            },
            pendingTurns: {
                ash: makeEmptyPendingTurn(),
                gary: makeEmptyPendingTurn(),
            },
        },
        'ash'
    );

    assert.deepEqual(payload.player.team, [
        firstPokemonRosterIndex,
        secondPokemonRosterIndex,
        thirdPokemonRosterIndex,
    ]);
    assert.deepEqual(payload.opponent.team, [
        thirdPokemonRosterIndex,
        secondPokemonRosterIndex,
        firstPokemonRosterIndex,
    ]);
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
            ash: { ladderPointsDelta: 18, rating: 1210, rewardSuppressedReason: '' },
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
    assert.deepEqual(payload.ladderResult, {
        ladderPointsDelta: 18,
        rating: 1210,
        rewardSuppressedReason: '',
    });
});

test('normalizeRecentLadderGames preserves surrender metadata for repeat-surrender checks', () => {
    const normalized = normalizeRecentLadderGames([
        {
            playedAt: new Date(),
            opponentUsername: 'Gary',
            winnerUsername: 'Gary',
            expDelta: 0,
            clanExpDelta: 0,
            unlockPointDelta: 0,
            surrenderedBy: 'Ash',
            endReason: 'SURRENDER',
            rewardSuppressedReason: 'self-surrender',
        },
    ]);

    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].surrenderedBy, 'Ash');
    assert.equal(normalized[0].endReason, 'surrender');
    assert.equal(normalized[0].rewardSuppressedReason, 'self-surrender');
    assert.equal(normalized[0].unlockPointDelta, 0);
});

test('repeat surrenderer helpers require three ladder surrenders in a row', () => {
    const recentLadderGames = normalizeRecentLadderGames([
        {
            playedAt: new Date(),
            opponentUsername: 'Gary',
            winnerUsername: 'Gary',
            surrenderedBy: 'Ash',
            endReason: 'surrender',
        },
        {
            playedAt: new Date(Date.now() - 1000),
            opponentUsername: 'Brock',
            winnerUsername: 'Brock',
            surrenderedBy: 'Ash',
            endReason: 'surrender',
        },
        {
            playedAt: new Date(Date.now() - 2000),
            opponentUsername: 'Misty',
            winnerUsername: 'Misty',
            surrenderedBy: 'Ash',
            endReason: 'surrender',
        },
        {
            playedAt: new Date(Date.now() - 3000),
            opponentUsername: 'Lt. Surge',
            winnerUsername: 'Ash',
            surrenderedBy: '',
            endReason: 'elimination',
        },
    ]);

    assert.equal(
        countCurrentLadderSurrenderStreakByUser({
            username: 'ash',
            recentLadderGames,
        }),
        3
    );
    assert.equal(
        isRepeatLadderSurrenderer({
            username: 'ash',
            recentLadderGames,
        }),
        true
    );
    assert.equal(
        isRepeatLadderSurrenderer({
            username: 'gary',
            recentLadderGames,
        }),
        false
    );
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

test('resolveExpiredTurnStartChoiceIfNeeded auto-picks the default prompt option', () => {
    const pendingTurn = makeEmptyPendingTurn();
    pendingTurn.turnStartChoice = {
        actorSlot: 0,
        sourceSkillId: 'saint-walker-radiant-hope',
        sourceUsername: 'ash',
        sourceSlot: 0,
        sourceStatusId: 'saint_walker_radiant_hope_active',
        promptText: 'Select 1 Radiant Hope effect.',
        options: [
            {
                key: 'defense',
                label: 'Grant one ally 20 permanent destructible defense',
                targetStrategy: 'alive-ally-lowest-hp',
                effect: {
                    type: 'apply_status',
                    statusId: 'saint_walker_radiant_hope_defense_option',
                    duration: 99,
                    metadata: {
                        destructibleDefensePoints: 20,
                        infiniteDuration: true,
                        tooltipText:
                            'This character has 20 points of permanent destructible defense from Radiant Hope.',
                    },
                },
            },
        ],
        maxUses: 1,
        usesUsed: 0,
    };

    const match = {
        matchId: 'match-test-turn-start-choice-timeout',
        mode: 'quick',
        arena: 'comic',
        status: 'active',
        currentTurn: 'ash',
        players: [
            { username: 'ash', team: [1, 2, 3], aliveCount: 1, profile: {} },
            { username: 'gary', team: [4, 5, 6], aliveCount: 1, profile: {} },
        ],
        board: {
            ash: [
                {
                    slot: 0,
                    rosterIndex: 1,
                    alive: true,
                    hp: 40,
                    state: {
                        statuses: [
                            {
                                id: 'saint_walker_radiant_hope_active',
                                remainingTurns: 1,
                                metadata: {
                                    turnStartChoiceQueued: true,
                                    turnStartChoiceMaxUses: 1,
                                    turnStartChoiceUsesUsed: 0,
                                },
                            },
                        ],
                    },
                },
            ],
            gary: [
                {
                    slot: 0,
                    rosterIndex: 4,
                    alive: true,
                    hp: 100,
                    state: { statuses: [] },
                },
            ],
        },
        pendingTurns: {
            ash: pendingTurn,
            gary: makeEmptyPendingTurn(),
        },
    };

    const resolved = resolveExpiredTurnStartChoiceIfNeeded({
        match,
        username: 'ash',
    });

    assert.equal(resolved, true);
    assert.equal(match.pendingTurns.ash.turnStartChoice, null);
    assert.equal(match.board.ash[0].state.statuses[0].metadata.turnStartChoiceQueued, false);
    assert.equal(match.board.ash[0].state.statuses[0].metadata.turnStartChoiceUsesUsed, 1);
    assert.match(
        match.board.ash[0].state.statuses[1].id,
        /saint_walker_radiant_hope_defense_option/
    );
});
