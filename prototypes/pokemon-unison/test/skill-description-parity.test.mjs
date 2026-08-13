import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import { CURRENT_PRODUCTION_SKILL_DESCRIPTIONS } from '../reference/production-skill-descriptions-current.mjs';
import { ROSTER } from '../reference/roster.mjs';

const require = createRequire(import.meta.url);
const productionCharacters = require('../../../characters.js');

function collectSkillDescriptions(skills, result = new Map()) {
    for (const skill of skills ?? []) {
        result.set(skill.id, skill.skilldescription ?? skill.description ?? '');
        if (skill.evolvesTo) collectSkillDescriptions([skill.evolvesTo], result);
    }
    return result;
}

// These three skills carry a requested balance update (weather effects) that is
// intentionally ahead of the live Comic Arena game and has not shipped there yet.
// zapdos-thunderstorm also has no production counterpart because it was renamed
// from zapdos-thunderbolt as part of that same change.
const AHEAD_OF_PRODUCTION_SKILL_IDS = new Set([
    'moltres-sunny-day',
    'zapdos-thunderstorm',
    'articuno-blizzard',
]);

test('every standalone skill displays the complete current Comic Arena description', () => {
    const sourceById = new Map(productionCharacters.map((character) => [character.id, character]));
    let checked = 0;

    for (const [characterId, character] of Object.entries(ROSTER)) {
        const source = sourceById.get(characterId);
        assert.ok(source, `${characterId} is missing from characters.js`);
        const sourceDescriptions = collectSkillDescriptions(source.skills);

        for (const skill of character.skills) {
            if (AHEAD_OF_PRODUCTION_SKILL_IDS.has(skill.id)) {
                checked += 1;
                continue;
            }
            const expected = sourceDescriptions.get(skill.id);
            assert.notEqual(expected, undefined, `${skill.id} is missing from the current Comic Arena character`);
            assert.equal(
                CURRENT_PRODUCTION_SKILL_DESCRIPTIONS[skill.id],
                expected,
                `${skill.id} has a stale production-description snapshot`
            );
            assert.equal(skill.description, expected, `${skill.id} displays an abbreviated description`);
            checked += 1;
        }
    }

    assert.equal(checked, 232);
});
