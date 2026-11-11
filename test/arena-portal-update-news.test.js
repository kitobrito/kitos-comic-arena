'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { comicPost, pokemonPost, buildLatestReleasesState } = require('../sync_arena_portal_update_news');

test('both update posts announce the redesign, the new characters and link their missions', () => {
    assert.equal(comicPost.arena, 'comic');
    assert.equal(pokemonPost.arena, 'pokemon');
    for (const [post, name, href] of [[comicPost, 'Deadpool', '/missions.html'], [pokemonPost, 'Blaziken', '/pokemon-missions']]) {
        const text = post.blocks.map((b) => b.text || '').join(' ');
        assert.match(text, /rebuilt/);
        assert.match(text, /portrait mode/);
        assert.match(text, new RegExp(name));
        assert.match(text, /have not forgotten/);
        assert.ok(post.blocks.some((b) => b.type === 'link' && b.href === href), `${name} mission link`);
        assert.ok(post.changes.length >= 5 && post.changes.every((c) => c.characterId === name.toLowerCase()));
    }
});

test('Latest Releases puts Deadpool and Blaziken first and keeps three per arena', () => {
    const state = buildLatestReleasesState({ releasesByArena: { comic: [{ characterId: 'a' }, { characterId: 'b' }, { characterId: 'c' }], pokemon: [{ characterId: 'primeape' }] } });
    assert.deepEqual(state.releasesByArena.comic.map((e) => e.characterId), ['deadpool', 'a', 'b']);
    assert.deepEqual(state.releasesByArena.pokemon.map((e) => e.characterId), ['blaziken', 'primeape']);
});

test('the server publishes the posts at startup, and news links stay inside the site', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(server, /await syncArenaPortalUpdateNews\(db\)/);
    const re = new RegExp(server.match(/const NEWS_LINK_HREF_RE = \/(.*)\/;/)[1]);
    assert.ok(re.test('/missions.html') && re.test('/pokemon-missions'));
    assert.ok(!re.test('https://evil.example') && !re.test('//evil.example') && !re.test('javascript:alert(1)'));
});
