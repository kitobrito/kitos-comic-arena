const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const scriptSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
const ingameSource = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');

test('sound manager routes media through Web Audio gain controls for iPhone Safari', () => {
    assert.match(scriptSource, /const ensureWebAudioMediaRoute = \(audio, channel = 'effects'\)/);
    assert.match(scriptSource, /musicOutputGain\.gain\.value = settings\.musicMuted \? 0 : settings\.volume/);
    assert.match(scriptSource, /effectsOutputGain\.gain\.value = settings\.effectsMuted \? 0 : settings\.volume/);
    assert.match(scriptSource, /ensureWebAudioMediaRoute\(currentMusic, 'music'\)/);
    assert.match(scriptSource, /ensureWebAudioMediaRoute\(audio, 'effects'\)/);
});

test('native muted state remains synchronized as a fallback', () => {
    assert.match(scriptSource, /currentMusic\.muted = settings\.musicMuted/);
    assert.match(scriptSource, /audio\.muted = settings\.effectsMuted/);
});

test('ingame page cache-busts the iPhone audio fix', () => {
    assert.match(ingameSource, /scripts\/script\.js\?[^"']*ios-audio-controls-v1/);
});
