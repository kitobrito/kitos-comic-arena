const test = require('node:test');
const assert = require('node:assert/strict');

const roster = require('../characters.js');

test('skills without effects are hidden helper skills or passives', () => {
    const offenders = [];

    roster.forEach((character, rosterIndex) => {
        (character?.skills || []).forEach((skill, skillIndex) => {
            const hasEffects = Array.isArray(skill?.effects) && skill.effects.length > 0;
            if (hasEffects) {
                return;
            }

            const classes = Array.isArray(skill?.classes) ? skill.classes.map((entry) => String(entry).toLowerCase()) : [];
            const isPassive = classes.includes('passive') || /passive/i.test(skill?.name || '');
            const isHiddenHelper = skill?.hiddenFromSelectionViewer === true;

            if (!isPassive && !isHiddenHelper) {
                offenders.push({
                    rosterIndex,
                    characterId: character?.characterId || character?.id || '',
                    skillIndex,
                    skillId: skill?.id || '',
                    skillName: skill?.name || '',
                });
            }
        });
    });

    assert.deepEqual(offenders, []);
});
