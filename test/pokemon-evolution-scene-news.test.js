'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { newsPost, syncPokemonEvolutionSceneNews } = require('../sync_pokemon_evolution_scene_news');

test('the evolution scene post publishes once at server startup', async () => {
    assert.equal(newsPost.arena, 'pokemon');
    assert.deepEqual(newsPost.blocks.map((b) => b.text), newsPost.paragraphs);
    assert.doesNotMatch(JSON.stringify(newsPost), /\p{Extended_Pictographic}/u, 'no emojis');
    const docs = new Map();
    const db = { collection: () => ({ async updateOne(filter, update) { docs.set(filter.title, { ...(docs.get(filter.title) || update.$setOnInsert), ...update.$set }); } }) };
    await syncPokemonEvolutionSceneNews(db); await syncPokemonEvolutionSceneNews(db);
    assert.equal(docs.size, 1);
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8'), /await syncPokemonEvolutionSceneNews\(db\)/);
});

test('the battlefield plays its evolution scene only for evolutions during the match', () => {
    const scene = fs.readFileSync(path.join(__dirname, '..', 'prototypes', 'arena-scene', 'scene.js'), 'utf8');
    assert.match(scene, /actor\.evolutionKey !== undefined && evolutionKey && evolutionKey !== actor\.evolutionKey/, 'a reload that is already evolved does not replay it');
    assert.match(scene, /if \(!motionOK\(\)\)/, 'reduced motion gets the short version');
    const css = fs.readFileSync(path.join(__dirname, '..', 'prototypes', 'arena-scene', 'scene.css'), 'utf8');
    for (const part of ['.scene-evo-pillar', '.scene-evo-flash', '.scene-evo-wave', '.scene-evo-banner']) assert.ok(css.includes(part), part);
});
