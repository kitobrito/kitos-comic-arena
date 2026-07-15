const test = require('node:test');
const assert = require('node:assert/strict');

const {
    diffCharacter,
    normalizeOverrides,
    parseArgs,
    syncOverrideCharacter,
    valuesMatch,
} = require('../scripts/pokemon-override-tool');

test('parseArgs reads sync character and json flags', () => {
    const parsed = parseArgs(['sync', '--character', 'magikarp', '--json']);
    assert.deepEqual(parsed, {
        command: 'sync',
        options: {
            characterId: 'magikarp',
            arena: 'pokemon',
            format: 'json',
        },
    });
});

test('normalizeOverrides supports stored override document shapes', () => {
    const normalized = normalizeOverrides({
        value: {
            overrides: [
                {
                    characterId: 'magikarp',
                    character: {
                        characterId: 'magikarp',
                        skills: [],
                    },
                },
            ],
        },
    });
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].characterId, 'magikarp');
});

test('diffCharacter highlights stale cooldowns and struggle conditions', () => {
    const canonical = {
        characterId: 'magikarp',
        skills: [
            {
                id: 'magikarp-struggle',
                cooldown: 0,
                actorCondition: { allOtherSkillsOnCooldown: true },
                effects: [{ type: 'damage', amount: 25, scope: 'target' }],
            },
            {
                id: 'gyarados-hyper-beam',
                cooldown: 3,
            },
        ],
    };
    const override = {
        characterId: 'magikarp',
        skills: [
            {
                id: 'magikarp-struggle',
                cooldown: 1,
                actorCondition: null,
                effects: [],
            },
            {
                id: 'gyarados-hyper-beam',
                cooldown: 4,
            },
        ],
    };

    const diff = diffCharacter(canonical, override);
    assert.equal(diff.skillDifferences.length, 2);
    assert.equal(
        diff.skillDifferences.find((entry) => entry.skillId === 'gyarados-hyper-beam').differences.cooldown.override,
        4
    );
    assert.equal(
        diff.skillDifferences.find((entry) => entry.skillId === 'magikarp-struggle').differences.actorCondition.override,
        null
    );
});

test('syncOverrideCharacter refreshes canonical skill values while preserving extra override fields', () => {
    const synced = syncOverrideCharacter(
        {
            characterId: 'magikarp',
            customEditorNote: 'keep me',
            skills: [{ id: 'gyarados-hyper-beam', cooldown: 4 }],
        },
        {
            characterId: 'magikarp',
            name: 'Magikarp',
            skills: [{ id: 'gyarados-hyper-beam', cooldown: 3 }],
        }
    );

    assert.equal(synced.customEditorNote, 'keep me');
    assert.equal(synced.name, 'Magikarp');
    assert.equal(synced.skills[0].cooldown, 3);
});

test('valuesMatch ignores object key order in nested skill metadata', () => {
    assert.equal(
        valuesMatch(
            {
                metadata: {
                    b: 2,
                    a: 1,
                },
            },
            {
                metadata: {
                    a: 1,
                    b: 2,
                },
            }
        ),
        true
    );
});
