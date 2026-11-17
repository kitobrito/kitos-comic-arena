'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { newsPost, syncPokemonArenaCombosNews } = require('../sync_pokemon_arena_combos_news');
const { POKEMON_REWORKED_IDS } = require('../pokemonReworkData');
const characters = require('../characters');

test('the V.4.1 post covers every reworked Pokemon and Blaziken, naming each main skill', () => {
    assert.equal(newsPost.arena, 'pokemon');
    assert.deepEqual(newsPost.changes.map((c) => c.characterId).sort(), [...POKEMON_REWORKED_IDS, 'blaziken'].sort());
    for (const c of newsPost.changes.filter((x) => x.characterId !== 'blaziken')) {
        const ch = characters.find((x) => x.id === c.characterId);
        assert.ok(ch.skills.some((s) => s.id === c.skillId && s.name === c.skillName), `${c.characterId}: main skill ${c.skillName} exists`);
        assert.match(c.text, new RegExp(`Main skill: ${c.skillName}\\.`));
        assert.ok(fs.existsSync(path.join(__dirname, '..', c.facePicture)), `${c.characterId} portrait exists`);
    }
    assert.match(newsPost.paragraphs.join(' '), /crit/i);
    assert.deepEqual(newsPost.blocks.map((b) => b.text), newsPost.paragraphs);
    assert.doesNotMatch(JSON.stringify(newsPost), /\p{Extended_Pictographic}/u, 'no emojis');
});

test('publishes once across server starts and keeps its first publication date', async () => {
    const docs = new Map();
    const db = { collection: () => ({ async updateOne(filter, update, options) {
        assert.deepEqual(options, { upsert: true });
        const old = docs.get(filter.title);
        docs.set(filter.title, { ...(old || update.$setOnInsert), ...update.$set });
    } }) };
    const first = new Date('2026-11-18T18:00:00Z');
    await syncPokemonArenaCombosNews(db, { now: first });
    await syncPokemonArenaCombosNews(db, { now: new Date('2026-11-19T18:00:00Z') });
    assert.equal(docs.size, 1);
    assert.equal(docs.get(newsPost.title).createdAt.toISOString(), first.toISOString());
    await assert.rejects(syncPokemonArenaCombosNews(null), /database connection is required/);
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8'), /await syncPokemonArenaCombosNews\(db\)/, 'synced at server startup');
});
