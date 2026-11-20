'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { comicPost, pokemonPost, syncExperimentalBattlefieldShotsNews } = require('../sync_experimental_battlefield_shots_news');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

test('the shots news posts publish once per arena at server startup', async () => {
    assert.equal(comicPost.arena, 'comic');
    assert.equal(pokemonPost.arena, 'pokemon');
    for (const post of [comicPost, pokemonPost]) {
        assert.deepEqual(post.blocks.map((b) => b.text), post.paragraphs);
        assert.doesNotMatch(JSON.stringify(post), /\p{Extended_Pictographic}/u, 'no emojis');
    }
    const docs = new Map();
    const db = { collection: () => ({ async updateOne(filter, update) { docs.set(filter.title, { ...(docs.get(filter.title) || update.$setOnInsert), ...update.$set }); } }) };
    await syncExperimentalBattlefieldShotsNews(db); await syncExperimentalBattlefieldShotsNews(db);
    assert.equal(docs.size, 2);
    assert.match(read('server.js'), /await syncExperimentalBattlefieldShotsNews\(db\)/);
});

test('ranged skills fire a shot timed to the hit, and aiming previews the damage', () => {
    const scene = read('prototypes', 'arena-scene', 'scene.js');
    assert.match(scene, /function shoot\(actor, target/);
    assert.match(scene, /launchIn: Math\.max\(0, hit - now - flight\)/, 'the shot arrives on the impact frame');
    assert.match(scene, /function syncDamagePreview\(\)/);
    assert.match(scene, /target-damage-preview-total/, 'reads the game\'s own preview');
    assert.match(scene, /navigator\.vibrate/);
    assert.match(scene, /pointer: coarse/, 'vibration only on touch screens');
    const css = read('prototypes', 'arena-scene', 'scene.css');
    for (const part of ['.scene-shot', '.scene-shot-pop', '.scene-dmg-ghost', '.scene-dmg-chunk']) assert.ok(css.includes(part), part);
    assert.match(read('ingame.html'), /scene\.js\?v=18/);
});
