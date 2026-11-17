'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { newsPost, syncPokemonArenaReworkNews } = require('../sync_pokemon_arena_rework_news');

const fixture = (initial = []) => {
    const docs = new Map(initial.map(doc => [doc.title, structuredClone(doc)]));
    const collections = [];
    const db = { collection(name) {
        collections.push(name);
        return { async updateOne(filter, update, options) {
            assert.deepEqual(filter, { title: newsPost.title });
            assert.deepEqual(options, { upsert: true });
            const old = docs.get(filter.title);
            docs.set(filter.title, { ...(old || update.$setOnInsert), ...structuredClone(update.$set) });
        } };
    } };
    return { db, docs, collections };
};

test('publishes the supplied Pokemon V4 post once across repeated server starts', async () => {
    const { db, docs, collections } = fixture();
    const first = new Date('2026-11-17T18:00:00Z');
    const later = new Date('2026-11-20T19:00:00Z');
    assert.deepEqual(await syncPokemonArenaReworkNews(db, { now: first }), { posts: 1 });
    await syncPokemonArenaReworkNews(db, { now: later });
    assert.equal(docs.size, 1);
    assert.deepEqual(collections, [process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts', process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts']);
    const post = docs.get('Pokemon Arena Update V.4.0: Roster Rework');
    assert.ok(post);
    assert.equal(post.arena, 'pokemon');
    assert.equal(post.author, newsPost.author);
    assert.deepEqual(post.blocks, newsPost.blocks);
    assert.deepEqual(post.paragraphs, newsPost.paragraphs);
    assert.deepEqual(post.changes, newsPost.changes);
    assert.equal(post.createdAt.toISOString(), first.toISOString());
    assert.equal(post.updatedAt.toISOString(), later.toISOString());
});

test('updates a post already created by the CLI without duplicating it or changing its publication date', async () => {
    const createdAt = new Date('2026-11-16T12:00:00Z');
    const { db, docs } = fixture([
        { title: newsPost.title, arena: 'pokemon', createdAt, blocks: [{ type: 'paragraph', text: 'Previous copy' }] },
        { title: 'Unrelated Comic news', arena: 'comic', createdAt },
    ]);
    await syncPokemonArenaReworkNews(db);
    assert.equal(docs.size, 2);
    const post = docs.get(newsPost.title);
    assert.equal(post.createdAt.toISOString(), createdAt.toISOString());
    assert.deepEqual(post.blocks, newsPost.blocks);
    assert.deepEqual(docs.get('Unrelated Comic news'), { title: 'Unrelated Comic news', arena: 'comic', createdAt });
});

test('uses the established startup connection and keeps the explicit standalone CLI', async () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(server, /await syncPokemonArenaReworkNews\(db\)/);
    const script = fs.readFileSync(path.join(__dirname, '..', 'sync_pokemon_arena_rework_news.js'), 'utf8');
    assert.match(script, /await syncPokemonArenaReworkNews\(client\.db\(dbName\)\)/);
    await assert.rejects(syncPokemonArenaReworkNews(null), /database connection is required/);
    await assert.rejects(syncPokemonArenaReworkNews({ collection: () => ({ updateOne: async () => { throw new Error('Write failed'); } }) }), /Write failed/);
});
