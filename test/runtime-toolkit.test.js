const test = require('node:test');
const assert = require('node:assert/strict');

const {
    applyCharacterOverrides,
    mergeCharacterOverrideRecord,
} = require('../scripts/lib/runtime-toolkit');

test('mergeCharacterOverrideRecord preserves base skills while applying nested override fields by id', () => {
    const merged = mergeCharacterOverrideRecord(
        {
            characterId: 'magikarp',
            skills: [
                { id: 'a', cooldown: 3, effects: [{ type: 'damage', amount: 10 }] },
                { id: 'b', cooldown: 2 },
            ],
        },
        {
            characterId: 'magikarp',
            skills: [{ id: 'a', cooldown: 1, effects: [{ type: 'damage', amount: 15 }] }],
        }
    );

    assert.equal(merged.skills.length, 2);
    assert.equal(merged.skills[0].cooldown, 1);
    assert.equal(merged.skills[0].effects[0].amount, 15);
    assert.equal(merged.skills[1].cooldown, 2);
});

test('applyCharacterOverrides merges matching characters and appends new override-only characters', () => {
    const applied = applyCharacterOverrides(
        [{ characterId: 'a', name: 'Base A' }],
        new Map([
            ['a', { characterId: 'a', role: 'DPS' }],
            ['b', { characterId: 'b', name: 'Only Override' }],
        ])
    );

    assert.equal(applied.length, 2);
    assert.equal(applied[0].role, 'DPS');
    assert.equal(applied[1].characterId, 'b');
});
