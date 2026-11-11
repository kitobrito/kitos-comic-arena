'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { POSTS, syncPatchNotes } = require('../sync_patch_notes');

test('every patch notes post is complete and unique', () => {
    const versions = new Set();
    for (const post of POSTS) {
        assert.ok(post.releaseVersion && !versions.has(post.releaseVersion), `unique releaseVersion ${post.releaseVersion}`);
        versions.add(post.releaseVersion);
        assert.ok(['comic', 'pokemon'].includes(post.arena), `${post.releaseVersion} arena`);
        assert.ok(post.title && post.blocks.some((b) => b.type === 'paragraph' && b.text.length > 40), `${post.releaseVersion} has text`);
        post.blocks.filter((b) => b.type === 'link').forEach((b) => assert.match(b.href, /^\/[^/]/, 'links stay inside the site'));
    }
});

test('syncPatchNotes upserts every post, newest with the latest createdAt', async () => {
    const docs = new Map();
    const db = { collection: () => ({ updateOne: async (filter, update) => {
        const prev = docs.get(filter.releaseVersion);
        docs.set(filter.releaseVersion, { ...(prev || update.$setOnInsert), ...update.$set });
    } }) };
    const result = await syncPatchNotes(db, { now: new Date('2026-11-12T00:00:00Z') });
    assert.equal(result.posts, POSTS.length);
    const times = POSTS.map((post) => docs.get(post.releaseVersion).createdAt.getTime());
    for (let i = 1; i < times.length; i += 1) assert.ok(times[i - 1] > times[i], 'POSTS[0] is the newest in the feed');
    assert.ok(docs.get(POSTS[0].releaseVersion).paragraphs.length > 0);
});

test('the server publishes the patch notes at startup', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(server, /await syncPatchNotes\(db\)/);
});
