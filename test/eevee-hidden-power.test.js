const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const { buildInitialBoard, computeTargetOptions, validateTargetSelection } = require('../battleLogic');

test('Eevee Hidden Power can be queued against a living enemy team', () => {
    const eeveeIndex = characters.findIndex((character) => character.id === 'eevee');
    const hiddenPowerIndex = characters[eeveeIndex].skills.findIndex(
        (skill) => skill.id === 'eevee-hidden-power'
    );
    const players = [
        { username: 'EeveeUser', team: [eeveeIndex] },
        { username: 'Opponent', team: [0, 1, 2] },
    ];
    const match = { players, board: buildInitialBoard(players, characters) };
    const options = computeTargetOptions({
        match,
        actingUsername: 'EeveeUser',
        actorSlot: 0,
        skillIndex: hiddenPowerIndex,
        characters,
    });

    assert.equal(options.targetType, 'random-enemy');
    assert.equal(options.mode, 'all');
    assert.equal(options.targets.length, 3);
    assert.equal(validateTargetSelection(options, options.targets), true);
});

test('the browser immediately recognizes Hidden Power as enemy targeting', () => {
    const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'script.js'), 'utf8');
    const ingame = fs.readFileSync(path.join(__dirname, '..', 'ingame.html'), 'utf8');
    assert.match(script, /case 'all-enemy':\s*case 'random-enemy':/);
    assert.match(script, /target === 'random-enemy'/);
    assert.match(ingame, /scripts\/script\.js\?v=eevee-hidden-power-v1/);
});
