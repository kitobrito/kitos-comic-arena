const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs: parseCharacterArgs } = require('../scripts/character-payload-tool');
const { parseArgs: parseLiveArgs, hashValue } = require('../scripts/live-deploy-verifier');
const { parseArgs: parseMatchArgs, summarizeUnit } = require('../scripts/match-debugger');
const { detectSkillDrift } = require('../scripts/balance-drift-checker');
const {
    normalizeArenaMode,
    assertTeamCanBeUsed,
    ensureRequiredMissionCatalogEntries,
    usernamesEqual,
    findMatchPlayerByUsername,
    findMatchOpponentByUsername,
    buildBattleBotTeam,
    scoreBattleBotDamageCoordination,
    buildHumanMatchStatsFilter,
    inferMatchArenaFromTeams,
    normalizeNewsArena,
    isTeamRosterInArena,
    buildPairedMatchDocument,
    setCachedBotTeamsForTests,
    resetMatchmakingStateForTests,
    getUserMatchForTests,
} = require('../server');

test('news arena classification separates explicit and legacy Pokemon posts', () => {
    assert.equal(normalizeNewsArena({ arena: 'pokemon', title: 'Onix arrives' }), 'pokemon');
    assert.equal(normalizeNewsArena({ arena: 'comic', title: 'Pokemon crossover event' }), 'comic');
    assert.equal(normalizeNewsArena({ title: 'Pokemon Arena Update V.3.3.1' }), 'pokemon');
    assert.equal(normalizeNewsArena({ title: 'Comic Arena Balance Update' }), 'comic');
});

test('battle bots focus damage without attacking enemies already projected to fall', () => {
    assert.ok(scoreBattleBotDamageCoordination({ hp: 60, projectedDamage: 25, candidateDamage: 35 }) > 100);
    assert.ok(scoreBattleBotDamageCoordination({ hp: 60, projectedDamage: 60, candidateDamage: 35 }) < -100);
    assert.ok(
        scoreBattleBotDamageCoordination({ hp: 60, projectedDamage: 25, candidateDamage: 35 }) >
        scoreBattleBotDamageCoordination({ hp: 60, projectedDamage: 0, candidateDamage: 35 })
    );
});
const characters = require('../characters');

const getCharacterId = (character = {}) => character.characterId || character.id || '';
const getCharacterArena = (character = {}) => normalizeArenaMode(character.arena || character.universe);
const getPlayableCharacterIdsForArena = (arena) =>
    characters
        .filter(
            (character) =>
                getCharacterId(character) &&
                Array.isArray(character.skills) &&
                character.skills.length > 0 &&
                getCharacterArena(character) === arena
        )
        .map((character) => getCharacterId(character))
        .slice(0, 3);
const getRosterIndexByCharacterIdForTest = (characterId) =>
    characters.findIndex((character) => getCharacterId(character) === characterId);
const getRosterIndicesForArena = (arena) =>
    getPlayableCharacterIdsForArena(arena).map((characterId) =>
        getRosterIndexByCharacterIdForTest(characterId)
    );

const assertTeamBelongsToArena = (team, arena) => {
    assert.equal(team.length, 3);
    assert.equal(isTeamRosterInArena(team, arena), true);
    team.forEach((rosterIndex) => {
        assert.equal(getCharacterArena(characters[rosterIndex]), arena);
    });
};

test('character payload tool parses inspect args', () => {
    const parsed = parseCharacterArgs(['inspect', '--character', 'magikarp', '--json']);
    assert.deepEqual(parsed, {
        command: 'inspect',
        options: {
            characterId: 'magikarp',
            json: true,
        },
    });
});

test('live deploy verifier parses options and hashes stably', () => {
    const parsed = parseLiveArgs(['--character', 'magikarp', '--url', 'https://example.com', '--json']);
    assert.equal(parsed.characterId, 'magikarp');
    assert.equal(parsed.url, 'https://example.com');
    assert.equal(parsed.json, true);
    assert.equal(hashValue({ a: 1 }).length, 12);
});

test('match debugger parses args and summarizes unit state', () => {
    const parsed = parseMatchArgs(['--username', 'ash', '--viewer', 'ash', '--arena', 'pokemon']);
    assert.equal(parsed.username, 'ash');
    assert.equal(parsed.viewer, 'ash');
    assert.equal(parsed.arena, 'pokemon');

    const summary = summarizeUnit(
        {
            alive: true,
            hp: 90,
            maxHp: 100,
            state: {
                cooldowns: { tackle: 1 },
                statuses: [{ id: 'burn', remainingTurns: 2, metadata: { turnEndDamage: 5 } }],
            },
        },
        0
    );
    assert.equal(summary.statusCount, 1);
    assert.equal(summary.cooldowns.tackle, 1);
});

test('balance drift checker catches text-to-effect mismatch', () => {
    const issues = detectSkillDrift({
        skilldescription: 'Deals 20 damage and loses 5 health.',
        effects: [
            { type: 'damage', amount: 25 },
            { type: 'HealthLoss', amount: 4 },
        ],
    });
    assert.equal(issues.length, 2);
});

test('balance drift checker ignores internal tracker durations', () => {
    const issues = detectSkillDrift({
        skilldescription: 'Protects one ally for 1 turn.',
        effects: [{ type: 'apply_status', duration: 99, metadata: { tracker: true } }],
    });
    assert.deepEqual(issues, []);
});

test('human match stats separate arena and mode while excluding bots', () => {
    assert.deepEqual(buildHumanMatchStatsFilter({ arena: 'pokemon', mode: 'quick' }), {
        arena: 'pokemon',
        status: 'ended',
        mode: 'quick',
        'botMatch.enabled': { $ne: true },
        players: {
            $not: {
                $elemMatch: {
                    $or: [
                        { isBot: true },
                        { username: { $regex: '^__game_bot__:', $options: 'i' } },
                    ],
                },
            },
        },
    });
});

test('legacy match arena inference requires every team slot to agree', () => {
    const comicIndex = characters.findIndex((character) => getCharacterArena(character) === 'comic');
    const pokemonIndex = characters.findIndex((character) => getCharacterArena(character) === 'pokemon');
    assert.equal(inferMatchArenaFromTeams({ players: [{ team: [pokemonIndex, pokemonIndex] }] }), 'pokemon');
    assert.equal(inferMatchArenaFromTeams({ players: [{ team: [comicIndex, pokemonIndex] }] }), null);
});

test('usernamesEqual ignores case and surrounding whitespace', () => {
    assert.equal(usernamesEqual('Vylheim', 'vylheim'), true);
    assert.equal(usernamesEqual(' BloodBlood ', 'bloodblood'), true);
});

test('buildBattleBotTeam keeps Comic bot teams Comic-only when stored teams contain Pokemon', async () => {
    const pokemonIds = getPlayableCharacterIdsForArena('pokemon');
    assert.equal(pokemonIds.length, 3);

    setCachedBotTeamsForTests([
        {
            teamId: 'pokemon-only',
            name: 'Pokemon Only',
            characterIds: pokemonIds,
        },
    ]);

    try {
        const team = await buildBattleBotTeam('comic');
        assertTeamBelongsToArena(team, 'comic');
    } finally {
        setCachedBotTeamsForTests(null);
    }
});

test('buildBattleBotTeam keeps Pokemon bot teams Pokemon-only with mixed stored teams', async () => {
    const comicIds = getPlayableCharacterIdsForArena('comic');
    const pokemonIds = getPlayableCharacterIdsForArena('pokemon');
    assert.equal(comicIds.length, 3);
    assert.equal(pokemonIds.length, 3);

    setCachedBotTeamsForTests([
        {
            teamId: 'comic-only',
            name: 'Comic Only',
            characterIds: comicIds,
        },
        {
            teamId: 'pokemon-only',
            name: 'Pokemon Only',
            characterIds: pokemonIds,
        },
    ]);

    try {
        const team = await buildBattleBotTeam('pokemon');
        assertTeamBelongsToArena(team, 'pokemon');
    } finally {
        setCachedBotTeamsForTests(null);
    }
});

test('buildPairedMatchDocument stores the requested arena in paired match mappings', () => {
    const team = getRosterIndicesForArena('pokemon');
    assertTeamBelongsToArena(team, 'pokemon');
    resetMatchmakingStateForTests();

    try {
        const match = buildPairedMatchDocument({
            username: 'Ash',
            team,
            opponent: {
                username: 'Gary',
                team,
            },
            mode: 'quick',
            arena: 'pokemon',
            profile: {},
        });

        assert.equal(match.arena, 'pokemon');
        assert.equal(getUserMatchForTests('Ash').arena, 'pokemon');
        assert.equal(getUserMatchForTests('Gary').arena, 'pokemon');
        assert.equal(getUserMatchForTests('Ash').matchId, match.matchId);
    } finally {
        resetMatchmakingStateForTests();
    }
});

test('buildPairedMatchDocument rejects cross-arena paired match teams before saving', () => {
    const comicTeam = getRosterIndicesForArena('comic');
    const pokemonTeam = getRosterIndicesForArena('pokemon');
    assertTeamBelongsToArena(comicTeam, 'comic');
    assertTeamBelongsToArena(pokemonTeam, 'pokemon');
    resetMatchmakingStateForTests();

    try {
        assert.throws(
            () =>
                buildPairedMatchDocument({
                    username: 'ComicPlayer',
                    team: comicTeam,
                    opponent: {
                        username: 'PokemonPlayer',
                        team: pokemonTeam,
                    },
                    mode: 'quick',
                    arena: 'comic',
                    profile: {},
                }),
            /does not belong to Comic Arena/i
        );
    } finally {
        resetMatchmakingStateForTests();
    }
});

test('match membership helpers ignore username casing for fetch recovery', () => {
    const match = {
        players: [
            { username: 'BloodBlood', team: [] },
            { username: 'ComicOpponent', team: [] },
        ],
    };

    assert.equal(findMatchPlayerByUsername(match, 'bloodblood').username, 'BloodBlood');
    assert.equal(findMatchOpponentByUsername(match, ' bloodblood ').username, 'ComicOpponent');
});

test('assertTeamCanBeUsed rejects Pokemon roster picks in Comic Arena', async () => {
    const rosterIndexById = new Map(
        characters.map((character, rosterIndex) => [character.characterId || character.id, rosterIndex])
    );
    await assert.rejects(
        () =>
            assertTeamCanBeUsed(
                {
                    missions: {},
                    arenas: {
                        comic: { unlockedCharacters: {} },
                        pokemon: {
                            unlockedCharacters: {
                                pikachu: true,
                                bulbasaur: true,
                                squirtle: true,
                            },
                        },
                    },
                },
                [
                    rosterIndexById.get('pikachu'),
                    rosterIndexById.get('bulbasaur'),
                    rosterIndexById.get('squirtle'),
                ],
                'player',
                'comic'
            ),
        /does not belong to Comic Arena/i
    );
});

test('ensureRequiredMissionCatalogEntries restores and refreshes Poison Ivy mission from comic defaults', () => {
    const repaired = ensureRequiredMissionCatalogEntries([
        {
            missionId: 'poison-ivy',
            arena: 'comic',
            reward_character: 'poison-ivy',
            reward_character_name: 'Poison Ivy',
            reward: 'Unlock Poison Ivy',
            goals: [
                {
                    type: 'win_matches',
                    character_id: 'the-joker',
                    character_name: 'The Joker',
                    wins: 5,
                },
                {
                    type: 'win_matches_same_team',
                    character_ids: ['the-joker', 'batman'],
                    character_names: ['The Joker', 'Batman'],
                    wins: 2,
                },
            ],
        },
    ]);

    const poisonIvyMission = repaired.find((mission) => mission.reward_character === 'poison-ivy');
    assert.ok(poisonIvyMission);
    assert.equal(poisonIvyMission.missionId, 'poison-ivy');
    assert.equal(poisonIvyMission.arena, 'comic');
    assert.deepEqual(
        poisonIvyMission.goals.map((goal) => ({
            type: goal.type,
            character_id: goal.character_id || '',
            character_ids: goal.character_ids || [],
            wins: goal.wins,
        })),
        [
            {
                type: 'win_matches',
                character_id: 'the-joker',
                character_ids: [],
                wins: 5,
            },
            {
                type: 'win_matches',
                character_id: 'batman',
                character_ids: [],
                wins: 5,
            },
            {
                type: 'win_streak_same_team',
                character_id: '',
                character_ids: ['the-joker', 'batman'],
                wins: 2,
            },
        ]
    );
});

test('ensureRequiredMissionCatalogEntries restores Aerodactyl mission from pokemon defaults', () => {
    const repaired = ensureRequiredMissionCatalogEntries([
        {
            missionId: 'aerodactyl-fossil-flight',
            arena: 'pokemon',
            reward_character: 'aerodactyl',
        },
    ]);

    const aerodactylMission = repaired.find((mission) => mission.reward_character === 'aerodactyl');
    assert.ok(aerodactylMission);
    assert.equal(aerodactylMission.missionId, 'aerodactyl-fossil-flight');
    assert.equal(aerodactylMission.arena, 'pokemon');
    assert.equal(aerodactylMission.image, 'assets/images/PokemonArena/missionpics/aerodactyl.avif');
    assert.deepEqual(
        aerodactylMission.goals.map((goal) => ({
            type: goal.type,
            character_id: goal.character_id || '',
            character_ids: goal.character_ids || [],
            wins: goal.wins,
        })),
        [
            {
                type: 'win_matches',
                character_id: 'scyther',
                character_ids: [],
                wins: 10,
            },
            {
                type: 'win_matches',
                character_id: 'hitmonlee',
                character_ids: [],
                wins: 10,
            },
            {
                type: 'win_streak_same_team',
                character_id: '',
                character_ids: ['scyther', 'hitmonlee'],
                wins: 4,
            },
        ]
    );
});

test('ensureRequiredMissionCatalogEntries keeps the easier Scyther mission from pokemon defaults', () => {
    const repaired = ensureRequiredMissionCatalogEntries([
        {
            missionId: 'scyther-trial',
            arena: 'pokemon',
            reward_character: 'scyther',
        },
    ]);

    const scytherMission = repaired.find((mission) => mission.reward_character === 'scyther');
    assert.ok(scytherMission);
    assert.equal(scytherMission.missionId, 'scyther-trial');
    assert.equal(scytherMission.arena, 'pokemon');
    assert.deepEqual(
        scytherMission.goals.map((goal) => ({
            type: goal.type,
            character_id: goal.character_id || '',
            character_ids: goal.character_ids || [],
            wins: goal.wins,
        })),
        [
            {
                type: 'win_matches',
                character_id: 'chansey',
                character_ids: [],
                wins: 4,
            },
            {
                type: 'win_matches',
                character_id: 'pidgey',
                character_ids: [],
                wins: 4,
            },
            {
                type: 'win_matches',
                character_id: 'koffing',
                character_ids: [],
                wins: 4,
            },
            {
                type: 'win_streak_same_team',
                character_id: '',
                character_ids: ['zubat', 'gastly'],
                wins: 3,
            },
        ]
    );
});

test('Pokemon Ladder milestone awards 1000 points for 25 human ranked wins', () => {
    const missions = ensureRequiredMissionCatalogEntries([]);
    const milestone = missions.find((mission) => mission.missionId === 'pokemon-ladder-first-25-wins');
    assert.ok(milestone);
    assert.equal(milestone.arena, 'pokemon');
    assert.equal(milestone.reward_unlock_points, 1000);
    assert.deepEqual(milestone.mode_restriction.allowed_modes, ['ladder']);
    assert.deepEqual(milestone.goals, [{ type: 'win_ladder_matches', wins: 25 }]);
});
