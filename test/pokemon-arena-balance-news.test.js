'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { newsPost, syncPokemonArenaBalanceNews } = require('../sync_pokemon_arena_balance_news');
const { POKEMON_REWORKED_IDS } = require('../pokemonReworkData');
const characters = require('../characters');

test('the V.4.2 balance post lists every reworked Pokemon with its real new numbers', () => {
    assert.equal(newsPost.arena, 'pokemon');
    assert.deepEqual(newsPost.changes.map((c) => c.characterId).sort(), [...POKEMON_REWORKED_IDS].sort());
    const charmander = newsPost.changes.find((c) => c.characterId === 'charmander').text;
    assert.match(charmander, /Flamethrower: cooldown 2 to 0, costs 1 Bloodline/);
    const flame = characters.find((c) => c.id === 'charmander').skills.find((s) => s.id === 'charmander-flamethrower');
    assert.equal(flame.cooldown, 0);
    for (const c of newsPost.changes) assert.ok(fs.existsSync(path.join(__dirname, '..', c.facePicture)), `${c.characterId} portrait exists`);
    assert.doesNotMatch(JSON.stringify(newsPost), /\p{Extended_Pictographic}/u, 'no emojis');
});

test('publishes once at server startup', async () => {
    const docs = new Map();
    const db = { collection: () => ({ async updateOne(filter, update) { docs.set(filter.title, { ...(docs.get(filter.title) || update.$setOnInsert), ...update.$set }); } }) };
    await syncPokemonArenaBalanceNews(db); await syncPokemonArenaBalanceNews(db);
    assert.equal(docs.size, 1);
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8'), /await syncPokemonArenaBalanceNews\(db\)/);
});
