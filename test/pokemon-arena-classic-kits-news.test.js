'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { newsPost, syncPokemonArenaClassicKitsNews } = require('../sync_pokemon_arena_classic_kits_news');

test('the classic kits post publishes once at server startup', async () => {
    assert.equal(newsPost.arena, 'pokemon');
    assert.deepEqual(newsPost.blocks.map((b) => b.text), newsPost.paragraphs);
    assert.doesNotMatch(JSON.stringify(newsPost), /\p{Extended_Pictographic}/u, 'no emojis');
    const docs = new Map();
    const db = { collection: () => ({ async updateOne(filter, update) { docs.set(filter.title, { ...(docs.get(filter.title) || update.$setOnInsert), ...update.$set }); } }) };
    await syncPokemonArenaClassicKitsNews(db); await syncPokemonArenaClassicKitsNews(db);
    assert.equal(docs.size, 1);
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8'), /await syncPokemonArenaClassicKitsNews\(db\)/);
});
