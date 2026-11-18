'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { newsPost, removedPostTitles, syncPokemonArenaClassicKitsNews } = require('../sync_pokemon_arena_classic_kits_news');

test('the classic kits post publishes once at server startup', async () => {
    assert.equal(newsPost.arena, 'pokemon');
    assert.deepEqual(newsPost.blocks.map((b) => b.text), newsPost.paragraphs);
    assert.doesNotMatch(JSON.stringify(newsPost), /\p{Extended_Pictographic}/u, 'no emojis');
    const docs = new Map();
    const db = { collection: () => ({
        async updateOne(filter, update) { docs.set(filter.title, { ...(docs.get(filter.title) || update.$setOnInsert), ...update.$set }); },
        async deleteMany(filter) {
            let n = 0;
            for (const [title, doc] of docs) if (doc.arena === filter.arena && filter.title.$in.includes(title)) { docs.delete(title); n++; }
            return { deletedCount: n };
        },
    }) };
    for (const title of removedPostTitles) docs.set(title, { title, arena: 'pokemon' });
    docs.set('Pokemon Arena Update V.3.3.2', { title: 'Pokemon Arena Update V.3.3.2', arena: 'pokemon' });
    docs.set(removedPostTitles[0] + ' (comic)', { title: removedPostTitles[0], arena: 'comic' });
    assert.deepEqual(await syncPokemonArenaClassicKitsNews(db), { posts: 1, removed: 3 });
    await syncPokemonArenaClassicKitsNews(db);
    for (const title of removedPostTitles) assert.ok(!docs.has(title), `${title} is removed`);
    assert.ok(docs.has('Pokemon Arena Update V.3.3.2'), 'other news stays');
    assert.ok(docs.has(removedPostTitles[0] + ' (comic)'), 'only Pokemon Arena posts are touched');
    assert.ok(docs.has(newsPost.title));
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8'), /await syncPokemonArenaClassicKitsNews\(db\)/);
});
