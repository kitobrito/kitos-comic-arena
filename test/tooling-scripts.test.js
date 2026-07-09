const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs: parseCharacterArgs } = require('../scripts/character-payload-tool');
const { parseArgs: parseLiveArgs, hashValue } = require('../scripts/live-deploy-verifier');
const { parseArgs: parseMatchArgs, summarizeUnit } = require('../scripts/match-debugger');
const { detectSkillDrift } = require('../scripts/balance-drift-checker');
const {
    assertTeamCanBeUsed,
    ensureRequiredMissionCatalogEntries,
    usernamesEqual,
} = require('../server');
const characters = require('../characters');

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

test('usernamesEqual ignores case and surrounding whitespace', () => {
    assert.equal(usernamesEqual('Vylheim', 'vylheim'), true);
    assert.equal(usernamesEqual(' BloodBlood ', 'bloodblood'), true);
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
