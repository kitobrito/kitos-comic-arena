const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const characters = require('../characters');
const { buildInitialBoard, computeTargetOptions, validateTargetSelection } = require('../battleLogic');

test('the browser immediately recognizes Hidden Power as enemy targeting', () => {
    const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'script.js'), 'utf8');
    const ingame = fs.readFileSync(path.join(__dirname, '..', 'ingame.html'), 'utf8');
    assert.match(script, /case 'all-enemy':\s*case 'random-enemy':/);
    assert.match(script, /target === 'random-enemy'/);
    assert.match(ingame, /scripts\/script\.js\?v=pokemon-battle-polish-v2/);
});
