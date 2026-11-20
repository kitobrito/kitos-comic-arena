'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { listRenders, buildManifest } = require('../scripts/build-scene-poses');
const { newsPost, pokemonPost, syncExperimentalBattlefieldPosesNews } = require('../sync_experimental_battlefield_poses_news');

test('every battlefield render has a pack name poses can be matched to', () => {
    const renders = listRenders();
    const names = new Map(renders.map((r) => [r.name, r.render]));
    assert.equal(names.get('charmander'), 'assets/images/selection-featured/PokemonArena/BIB/' + path.basename(names.get('charmander')));
    assert.match(names.get('iron-man'), /^assets\/images\/BIB\/comic\//);
    for (const { render } of renders) assert.ok(fs.existsSync(path.join(__dirname, '..', render)), render);
});

test('pose files are matched to their render by name and pose, with numbered frames in order', () => {
    const renders = [{ name: 'charmander', render: 'r/charmander.webp' }, { name: 'iron-man', render: 'r/iron-man.webp' }, { name: 'rick-grimes', render: 'r/rick.gif' }];
    const files = ['charmander-attack.png', 'charmander-ko.webp', 'iron-man-hit.png', 'ironman-hit.png', 'charmander-dance.png', 'README.md', 'poses.json',
        'rick-grimes-attack-3.webp', 'rick-grimes-attack.webp', 'rick-grimes-attack-2.webp'];
    const boxes = { 'rick-grimes-attack-2.webp': { box: [-0.1, 0.2, 2.1, 0.8] }, 'rick-grimes-attack.webp': { box: [1, 2] } };
    const { poses, unmatched } = buildManifest({ renders, files, boxes });
    assert.deepEqual(poses['r/charmander.webp'], { attack: [{ src: '/assets/images/poses/charmander-attack.png' }], ko: [{ src: '/assets/images/poses/charmander-ko.webp' }] });
    assert.deepEqual(poses['r/iron-man.webp'], { hit: [{ src: '/assets/images/poses/iron-man-hit.png' }] });
    assert.deepEqual(poses['r/rick.gif'].attack, [
        { src: '/assets/images/poses/rick-grimes-attack.webp' }, // a malformed box is ignored
        { src: '/assets/images/poses/rick-grimes-attack-2.webp', box: [-0.1, 0.2, 2.1, 0.8] },
        { src: '/assets/images/poses/rick-grimes-attack-3.webp' },
    ]);
    assert.deepEqual(unmatched, ['charmander-dance.png', 'ironman-hit.png']);
});

test('the shipped pose art is all matched and present', () => {
    const { poses, unmatched } = buildManifest();
    assert.deepEqual(unmatched, []);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'data', 'scene-poses.json'), 'utf8')).poses, poses, 'run node scripts/build-scene-poses.js');
    for (const kinds of Object.values(poses)) for (const frames of Object.values(kinds)) for (const { src } of frames) assert.ok(fs.existsSync(path.join(__dirname, '..', src)), src);
    assert.equal(poses['assets/images/BIB/comic/rick-grimes.gif'].attack.length, 3);
    assert.equal(poses['assets/images/BIB/comic/rage-infected-full.webp'].attack.length, 4);
    assert.deepEqual(Object.keys(poses['assets/images/BIB/comic/rage-infected-full.webp']).sort(), ['attack', 'hit', 'ko']);
    assert.equal(poses['assets/images/BIB/comic/walker-full.webp'].attack.length, 4);
    const homelander = poses['assets/images/BIB/comic/homelander-full.webp'];
    const forSkill = (id) => homelander.attack.filter((f) => f.skills?.includes(id)).map((f) => path.basename(f.src));
    assert.deepEqual(forSkill('homelander-laser-death-beam'), ['homelander-laser-1.webp', 'homelander-laser-2.webp']);
    assert.deepEqual(forSkill('homelander-flying-assault'), ['homelander-fly.webp', 'homelander-punch.webp']);
    assert.deepEqual(forSkill('homelander-god-s-fist'), ['homelander-punch.webp']);
    assert.equal(homelander.beam[0].origin.length, 2);
    assert.ok(homelander.beam[0].skills.includes('homelander-laser-death-beam-empowered'));
});

test('the battlefield swaps in poses only where art exists', () => {
    const scene = fs.readFileSync(path.join(__dirname, '..', 'prototypes', 'arena-scene', 'scene.js'), 'utf8');
    assert.match(scene, /scene-poses\.json/);
    for (const call of ["playPoseFrames(actor, 'attack'", "showPose(card, 'hit'", "showPose(card, 'ko', Infinity)", 'attackFramesFor(actors.get(actor), skillId)', 'drawBeam(actor, t, beam']) assert.ok(scene.includes(call), call);
    assert.match(scene, /if \(!actor \|\| !frame \|\| \(card\.dataset\.pose === 'ko'/, 'no art, no swap; a ko pose is not interrupted');
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'data', 'scene-poses.json'), 'utf8'));
    assert.ok(manifest.poses && typeof manifest.poses === 'object');
});

test('the battle frames news post publishes once at server startup', async () => {
    assert.equal(newsPost.arena, 'comic');
    assert.equal(pokemonPost.arena, 'pokemon');
    for (const post of [newsPost, pokemonPost]) {
        assert.deepEqual(post.blocks.map((b) => b.text), post.paragraphs);
        assert.doesNotMatch(JSON.stringify(post), /\p{Extended_Pictographic}/u, 'no emojis');
    }
    const docs = new Map();
    const db = { collection: () => ({ async updateOne(filter, update) { docs.set(filter.title, { ...(docs.get(filter.title) || update.$setOnInsert), ...update.$set }); } }) };
    await syncExperimentalBattlefieldPosesNews(db); await syncExperimentalBattlefieldPosesNews(db);
    assert.equal(docs.size, 2);
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8'), /await syncExperimentalBattlefieldPosesNews\(db\)/);
});
