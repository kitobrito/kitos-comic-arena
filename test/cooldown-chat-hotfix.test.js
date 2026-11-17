const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');

const byId = (id) => {
    const character = characters.find((entry) => entry.id === id);
    assert.ok(character, `Missing character ${id}`);
    return character;
};

const skill = (character, id) => {
    const entry = character.skills.find((candidate) => candidate.id === id);
    assert.ok(entry, `Missing skill ${id}`);
    return entry;
};

test('Krabby and Kingler Bubble only increase active cooldowns', () => {
    const krabby = byId('krabby');
    ['krabby-leer', 'kingler-leer'].forEach((skillId) => {
        const bubble = skill(krabby, skillId);
        const cooldownEffect = bubble.effects.find((effect) => effect.type === 'modify_cooldowns');
        assert.ok(cooldownEffect);
        assert.equal(cooldownEffect.includeAllCharacterSkills, undefined);
        assert.match(bubble.skilldescription, /active cooldowns/);
    });
});

test('Jolteon cooldown penalties wait for affected Pokemon to use a skill', () => {
    const jolteon = byId('jolteon');
    const pinMissile = skill(jolteon, 'jolteon-pin-missile').effects.find(
        (effect) => effect.statusId === 'jolteon_pin_missile_cooldown_increase'
    );
    const thunderFang = skill(jolteon, 'jolteon-thunder-fang').effects.find(
        (effect) => effect.statusId === 'jolteon_thunder_fang_cooldown_increase'
    );

    [pinMissile, thunderFang].forEach((effect) => {
        assert.ok(effect);
        assert.equal(effect.metadata.newSkillCooldownIncrease, 1);
        assert.equal(effect.metadata.ownerTurnEndExtraCooldownTicksAllSkills, undefined);
        assert.equal(effect.metadata.harmful, true);
    });
});

test('classic battle chat opens clear of the skill description panel', () => {
    const root = path.join(__dirname, '..');
    const styles = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
    const ingame = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');

    assert.match(
        styles,
        /html:not\(\.battle-experimental\) \.match-chat-panel \{[\s\S]*?bottom: calc\(100% \+ 96px\);/
    );
    assert.match(ingame, /classic-chat-clear-v1/);
});
