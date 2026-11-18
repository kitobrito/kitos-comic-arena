'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { comicPost, pokemonPost, syncExperimentalBattlefieldPhoneNews } = require('../sync_experimental_battlefield_phone_news');

test('one phone skills post per arena, published once at server startup', async () => {
    assert.equal(comicPost.arena, 'comic');
    assert.equal(pokemonPost.arena, 'pokemon');
    for (const post of [comicPost, pokemonPost]) {
        assert.deepEqual(post.blocks.map((b) => b.text), post.paragraphs);
        assert.match(post.paragraphs.join(' '), /four skills right under its feet/);
        assert.match(post.paragraphs.join(' '), /Experimental battlefield \(beta\)/);
        assert.doesNotMatch(JSON.stringify(post), /\p{Extended_Pictographic}/u, 'no emojis');
    }
    const docs = new Map();
    const db = { collection: () => ({ async updateOne(filter, update) { docs.set(filter.title, { ...(docs.get(filter.title) || update.$setOnInsert), ...update.$set }); } }) };
    await syncExperimentalBattlefieldPhoneNews(db); await syncExperimentalBattlefieldPhoneNews(db);
    assert.equal(docs.size, 2);
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8'), /await syncExperimentalBattlefieldPhoneNews\(db\)/);
});
