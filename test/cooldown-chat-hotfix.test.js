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
