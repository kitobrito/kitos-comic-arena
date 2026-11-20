'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { listRenders, buildManifest } = require('../scripts/build-scene-poses');

test('every battlefield render has a pack name poses can be matched to', () => {
    const renders = listRenders();
    const names = new Map(renders.map((r) => [r.name, r.render]));
    assert.equal(names.get('charmander'), 'assets/images/selection-featured/PokemonArena/BIB/' + path.basename(names.get('charmander')));
    assert.match(names.get('iron-man'), /^assets\/images\/BIB\/comic\//);
    for (const { render } of renders) assert.ok(fs.existsSync(path.join(__dirname, '..', render)), render);
});

test('pose files are matched to their render by name and pose', () => {
    const renders = [{ name: 'charmander', render: 'r/charmander.webp' }, { name: 'iron-man', render: 'r/iron-man.webp' }];
    const { poses, unmatched } = buildManifest({ renders, files: ['charmander-attack.png', 'charmander-ko.webp', 'iron-man-hit.png', 'ironman-hit.png', 'charmander-dance.png', 'README.md'] });
    assert.deepEqual(poses, {
        'r/charmander.webp': { attack: '/assets/images/poses/charmander-attack.png', ko: '/assets/images/poses/charmander-ko.webp' },
        'r/iron-man.webp': { hit: '/assets/images/poses/iron-man-hit.png' },
    });
    assert.deepEqual(unmatched, ['charmander-dance.png', 'ironman-hit.png']);
});

test('the battlefield swaps in poses only where art exists', () => {
    const scene = fs.readFileSync(path.join(__dirname, '..', 'prototypes', 'arena-scene', 'scene.js'), 'utf8');
    assert.match(scene, /scene-poses\.json/);
    for (const call of ["showPose(actor, 'attack'", "showPose(card, 'hit'", "showPose(card, 'ko', Infinity)"]) assert.ok(scene.includes(call), call);
    assert.match(scene, /if \(!url \|\| \(card\.dataset\.pose === 'ko'/, 'no art, no swap; a ko pose is not interrupted');
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'data', 'scene-poses.json'), 'utf8'));
    assert.ok(manifest.poses && typeof manifest.poses === 'object');
});
