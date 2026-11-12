'use strict';

// Patch notes for Comic Arena and Pokemon Arena: one news post per update, so players always hear
// what was added, changed or taken away. Every change that ships adds a post to POSTS (newest
// first). Run by server.js at startup; each post is upserted by its releaseVersion, so running it
// again only refreshes the text. (Shattered Realms' patch notes live in its own game, in
// src/ui/patch-notes.js of shattered-realms-tcg, and its site section reads them from there.)

const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const p = (text) => ({ type: 'paragraph', text });
const link = (text, href) => ({ type: 'link', text, href });
const divider = { type: 'divider' };

const SITE_CLEANUP = [
    p('A little spring cleaning on the website. Shattered Realms now has its own section in the portal (pick it in the bar at the top of every page), so the old Shattered Realms banner across the top of the site, the "Play Shattered Realms" button in the side menu and the Shattered Realms logo next to the Anime-Arena banner have been removed.'),
];

const POSTS = [
    {
        releaseVersion: 'patch-2026-11-12-site-cleanup-pokemon',
        title: 'Pokemon Arena: Home Page Cleanup',
        arena: 'pokemon',
        author: 'kito',
        blocks: [
            ...SITE_CLEANUP,
            p('The row of Poke Ball and evolution stone icons on the Pokemon Arena home page is gone too. Everything it linked to is still in the battle menu on the left: Pokemon Characters, Pokemon Missions and Play Pokemon-Arena.'),
        ],
    },
    {
        releaseVersion: 'patch-2026-11-12-site-cleanup-comic',
        title: 'Comic Arena: Home Page Cleanup',
        arena: 'comic',
        author: 'kito',
        blocks: [...SITE_CLEANUP],
    },
    {
        releaseVersion: 'patch-2026-11-11-abra-eevee',
        title: 'Pokemon Arena: Abra Can Teleport Alone, Eevee Stays',
        arena: 'pokemon',
        author: 'kito',
        blocks: [
            p('Abra and Kadabra: Teleport can now target themselves as well as an ally, so they can still go invulnerable when they are the last Pokemon standing. Before, Teleport needed an ally and did nothing once the rest of the team had fallen.'),
            p('Eevee: choosing her evolution (Jolteon, Flareon or Vaporeon) now adds that evolution to your roster and keeps Eevee playable too, instead of replacing her. If you already evolved your Eevee, she is back in your roster, and saved teams with Eevee in them keep working.'),
            divider,
            link('See every Pokemon and their skills', '/pokemon-charactersandskills.html'),
        ],
    },
];

const paragraphsOf = (post) => post.blocks.filter((block) => block.type === 'paragraph').map((block) => block.text);

async function syncPatchNotes(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const now = options.now instanceof Date ? options.now : new Date();
    const newsPosts = db.collection(newsCollectionName);
    // Oldest first, each a millisecond apart, so new posts land in the feed (sorted by createdAt) in order.
    const oldestFirst = [...POSTS].reverse();
    for (let i = 0; i < oldestFirst.length; i += 1) {
        const post = oldestFirst[i];
        await newsPosts.updateOne(
            { releaseVersion: post.releaseVersion },
            { $set: { ...post, paragraphs: paragraphsOf(post), updatedAt: now }, $setOnInsert: { createdAt: new Date(now.getTime() + 1 + i) } },
            { upsert: true }
        );
    }
    return { posts: POSTS.length };
}

module.exports = { POSTS, syncPatchNotes };
