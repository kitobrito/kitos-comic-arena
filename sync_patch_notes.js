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

const BATTLE_FX = [
    p('Every battle looks different now. Every character and every skill in both arenas has its own animation: the caster winds up and lunges, the move flies across the board in its own colours, and the target flinches harder the bigger the hit. Fighters jump onto the board when a match starts, and the winners celebrate when it ends.'),
    p('Death animations are brand new, and each one depends on what killed you. By default a defeated portrait lifts up and explodes into pieces that fade away. Lightsabers cut it apart in the wielder\'s own colours (General Grievous uses all four of his). Negan beats it to a pulp with Lucille. Homelander, Superman and Billy Butcher\'s eyes glow before their lasers fire straight from their eyes. Every death has its own stamp, from LUCILLE\'D to LASERED to TOASTY.'),
    p('Every status effect on a portrait has been redrawn: taunts, webs, smoke, ice, sniper and smartgun locks, portals, rage, Aquaman\'s circling shark fins and the rest. Several can now show on one character at the same time (before, some hid each other), and they fade in and out instead of popping.'),
    p('The Skill animations and Death animations switches in the battle options still turn all of this off.'),
];

const NO_ZOOM = [
    p('Phones held upright no longer zoom on the character select screen or in battle. Tapping the arrows quickly (or double tapping anywhere) used to zoom into the background and throw the whole screen out of place. Pinching won\'t zoom there either. Turn your phone sideways if you want to pinch-zoom.'),
    p('Character select: tapping the page arrows quickly now just flips through more pages, even on the first and last page. Double tapping a character in your team removes it again (it was getting swallowed by the zoom).'),
    p('In battle on phones, double tapping now works like double clicking: double tap an empty spot to take back the last skill you confirmed, or double tap the skill itself, its small icon on your character, or its icon in the turn order to take that one back. Double clicking the small icon on your character works on computers too now.'),
];

const POSTS = [
    {
        releaseVersion: 'patch-2026-11-12-lance-team-skills',
        title: 'Pokemon Arena: Lance\'s Team in Character Files',
        arena: 'pokemon',
        author: 'kito',
        blocks: [
            p('Click Lance in Character Files to see his whole team under "Lance\'s team": Dragonite, Gyarados and Aerodactyl, plus the partner that takes over when each one faints (Charizard, Kingdra and a second Dragonite). Tap any of them to see their skills.'),
        ],
    },
    {
        releaseVersion: 'patch-2026-11-12-mega-blaziken-render',
        title: 'Pokemon Arena: Mega Blaziken on Character Select',
        arena: 'pokemon',
        author: 'kito',
        blocks: [
            p('Blaziken now has a Mega toggle on the character select screen. Tap the second dot under Blaziken (or pick Blaze Kick in its skills) to see Mega Blaziken in its new artwork.'),
        ],
    },
    {
        releaseVersion: 'patch-2026-11-12-no-zoom-pokemon',
        title: 'Pokemon Arena: No More Accidental Zoom on Phones',
        arena: 'pokemon',
        author: 'kito',
        blocks: [...NO_ZOOM],
    },
    {
        releaseVersion: 'patch-2026-11-12-no-zoom-comic',
        title: 'Comic Arena: No More Accidental Zoom on Phones',
        arena: 'comic',
        author: 'kito',
        blocks: [...NO_ZOOM],
    },
    {
        releaseVersion: 'patch-2026-11-12-pidgey-random-pokemon',
        title: 'Pokemon Arena: Pidgey Goes All Random',
        arena: 'pokemon',
        author: 'kito',
        blocks: [
            p('Pidgey and Pidgeotto now use only random energy, so they fit on any team. To make up for it, their skills have cooldowns:'),
            p('Pidgey: Gust costs 1 random energy with a 1 turn cooldown (was 1 Bloodline, no cooldown). Whirlwind costs 2 random with a 5 turn cooldown (was 2 Bloodline, 3 turns). Peck costs 2 random with a 1 turn cooldown (was 1 Taijutsu + 1 random, no cooldown).'),
            p('Pidgeotto: Gust costs 1 random with a 1 turn cooldown (was 1 Bloodline, no cooldown). Whirlwind costs 3 random with a 5 turn cooldown (was 2 Bloodline + 1 random, 3 turns). Peck costs 2 random with a 1 turn cooldown (was 1 Taijutsu + 1 random, no cooldown).'),
            p('Sand-Attack is unchanged.'),
            divider,
            p('Character Files: Lance now shows as a single portrait in the roster. His Dragonite, Gyarados and Aerodactyl no longer get their own tiles next to him (they still all take the field when you pick him).'),
        ],
    },
    {
        releaseVersion: 'patch-2026-11-12-battle-animations-pokemon',
        title: 'Pokemon Arena: Brand New Battle Animations',
        arena: 'pokemon',
        author: 'kito',
        blocks: [
            ...BATTLE_FX,
            p('Pokemon knockouts follow the move type that landed them: fire burns the portrait to ash that blows away, grass wraps it in vines and squeezes until it pops, electric fries it black, water washes it away, dragon slashes it into falling strips with a green claw, rock crushes it flat, ground splits it down the middle, and every other type has its own.'),
        ],
    },
    {
        releaseVersion: 'patch-2026-11-12-battle-animations-comic',
        title: 'Comic Arena: Brand New Battle Animations',
        arena: 'comic',
        author: 'kito',
        blocks: [...BATTLE_FX],
    },
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
