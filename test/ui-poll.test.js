'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('the character select screen loads the Experimental Battlefield poll', () => {
    const html = read('selection.html');
    assert.match(html, /scripts\/ui-poll\.js/);
    assert.match(html, /styles\/ui-poll\.css/);
    const server = read('server.js');
    assert.match(server, /'\/scripts\/ui-poll\.js',/, 'the script is on the served-scripts list');
    assert.match(server, /'experimental-battlefield-2026-11': \{/);
    assert.match(server, /app\.get\('\/api\/polls\/:pollId', requireSession/);
    assert.match(server, /app\.post\('\/api\/polls\/:pollId\/vote', requireSession/);
    assert.match(server, /updateOne\(\{ _id: user\._id, username: user\.username \}/, 'votes are saved on the voter’s own account');
});

test('one vote per account, totals counted across accounts (in-memory store)', async () => {
    const { MemoryCollection } = require('../prototypes/arena-scene/test/fixture.cjs');
    const users = new MemoryCollection([{ username: 'a' }, { username: 'b' }]);
    const id = 'experimental-battlefield-2026-11';
    const vote = (u, choice) => users.updateOne({ username: u }, { $set: { [`polls.${id}`]: { choice } } });
    await vote('a', 'like'); await vote('b', 'dislike'); await vote('a', 'dislike');
    assert.equal(await users.countDocuments({ [`polls.${id}.choice`]: 'like' }), 0);
    assert.equal(await users.countDocuments({ [`polls.${id}.choice`]: 'dislike' }), 2);
});

test('the poll news post is published for both arenas at startup', async () => {
    const { comicPost, pokemonPost, syncExperimentalBattlefieldPollNews } = require('../sync_experimental_battlefield_poll_news');
    assert.deepEqual([comicPost.arena, pokemonPost.arena], ['comic', 'pokemon']);
    for (const post of [comicPost, pokemonPost]) assert.doesNotMatch(JSON.stringify(post), /\p{Extended_Pictographic}/u, 'no emojis');
    const docs = new Map();
    const db = { collection: () => ({ async updateOne(f, u) { docs.set(f.title, { ...(docs.get(f.title) || u.$setOnInsert), ...u.$set }); } }) };
    await syncExperimentalBattlefieldPollNews(db); await syncExperimentalBattlefieldPollNews(db);
    assert.equal(docs.size, 2);
    assert.match(read('server.js'), /await syncExperimentalBattlefieldPollNews\(db\)/);
});
