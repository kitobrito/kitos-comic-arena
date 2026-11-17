'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { comicPost, pokemonPost, syncExperimentalBattlefieldNews } = require('../sync_experimental_battlefield_news');

test('both posts explain the opt-in battlefield, how to turn it on and off, and the energy animation', () => {
    assert.equal(comicPost.arena, 'comic');
    assert.equal(pokemonPost.arena, 'pokemon');
    for (const post of [comicPost, pokemonPost]) {
        const text = post.blocks.map((b) => b.text || '').join(' ');
        assert.match(text, /Experimental battlefield \(beta\)/);
        assert.match(text, /Settings/);
        assert.match(text, /Classic view/);
        assert.match(text, /classic view stays the default/);
        assert.match(text, /destroyed/);
        assert.match(text, /stole/);
        assert.doesNotMatch(text, /discord/i);
    }
});

test('the server publishes the posts at startup, once each, without moving them on later starts', async () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(server, /await syncExperimentalBattlefieldNews\(db\)/);
    const docs = new Map();
    const db = { collection: () => ({ updateOne: async (filter, update) => {
        const existing = docs.get(filter.releaseVersion);
        docs.set(filter.releaseVersion, { ...(existing || update.$setOnInsert), ...update.$set });
    } }) };
    await syncExperimentalBattlefieldNews(db, { now: new Date('2026-11-17T16:00:00Z') });
    await syncExperimentalBattlefieldNews(db, { now: new Date('2026-11-20T16:00:00Z') });
    assert.equal(docs.size, 2);
    for (const doc of docs.values()) {
        assert.equal(doc.createdAt.toISOString(), '2026-11-17T16:00:00.000Z');
        assert.ok(doc.paragraphs.length >= 6);
    }
});
