'use strict';

// News for the Arena Portal update: the website redesign, the in-game portrait-mode UI, and the two
// new characters (Deadpool for Comic Arena, Blaziken for Pokemon Arena). Run by server.js at
// startup; safe to run again (each post is upserted by its releaseVersion) and it puts both
// characters at the front of the homepage's Latest Releases.

const characters = require('./characters');

const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';
const appStateCollectionName = process.env.MONGODB_APP_STATE_COLLECTION || 'app_state';
const latestReleasesKey = 'latest_character_releases';

const find = (id) => characters.find((character) => character?.characterId === id) || null;
const deadpool = find('deadpool');
const blaziken = find('blaziken');

const skillChanges = (character, groupName) =>
    (character?.skills || [])
        .filter((skill) => !skill.hiddenFromSelectionViewer || skill.id === 'blaziken-blaze-kick')
        .map((skill) => ({
            groupKey: `release:${character.characterId}`,
            groupName,
            collapsible: true,
            changeType: 'new',
            characterId: character.characterId,
            characterName: character.name,
            facePicture: character.facePicture || '',
            skillId: skill.id,
            skillName: skill.name,
            skillimage: skill.skillimage,
            text: skill.skilldescription,
        }));

const p = (text) => ({ type: 'paragraph', text });
const link = (text, href) => ({ type: 'link', text, href });
const divider = { type: 'divider' };

const REDESIGN = [
    p("The website has been rebuilt from the ground up. Comic Arena, Pokemon Arena and Shattered Realms now live together in one portal, and each game finally has a look of its own: Comic Arena in hot amber and black comic-book ink, Pokemon Arena in electric cyan stadium glass, and Shattered Realms in dark-fantasy gold. The new bar across the top of every page switches between the three games, and remembers which one is yours."),
    p("There is also a new Split view that puts Comic Arena and Pokemon Arena side by side with live news and ladders, a short welcome guide for new players (the ? button in the top bar opens it again), and a full Shattered Realms section with its own patch notes, ladder and account page. Every page has been reworked for phones."),
    p('Battles got the same treatment. The in-game screen has been remade for both widescreen and portrait mode: it fills a phone held sideways, and holding your phone upright now gives you a layout made for portrait instead of a shrunken desktop screen. Each game has its own battle theme, skills sit right beside each portrait, Surrender, Chat and Settings live along the bottom, and the Exchange button no longer covers your energy counts.'),
    p('Team select works better on phones too: tap to pick a fighter and double tap a team slot to remove it, including on phones held sideways. Store and Missions are now in the phone menu.'),
];

const THANKS_AND_PROMISE = (game) => [
    p(`Thank you to everyone who has kept playing ${game} through the quiet stretch. I have not forgotten about Comic Arena or Pokemon Arena. Shattered Realms has taken a lot of my time lately, but both arenas are getting more support soon: more characters, more balance passes and more missions are on the way.`),
    p('If something looks wrong on the new site or in battle, especially on your phone, please let me know on Discord. See you in the queue.'),
];

const comicPost = {
    releaseVersion: 'arena-portal-update-comic-v1',
    title: 'Comic Arena: A Whole New Look, Portrait Battles, and Deadpool',
    arena: 'comic',
    author: 'kito',
    blocks: [
        ...REDESIGN,
        divider,
        p("And he's here: Deadpool joins Comic Arena. Wade Wilson is the only one in the arena who knows he's in a game, and he plays like it: two katanas, too many guns, and a healing factor that turns every mistake into a punchline. He's built around tempo: every hit he lands sets up a harder next one, and if you leave him alone he simply heals back up."),
        p("Katana Slice (1 Taijutsu) deals 20 piercing damage and gives him 10 extra damage on his skills for a turn. Gun Play (1 Bloodline) deals 15 piercing damage to one enemy and 10 to another random enemy, plus 5 extra damage for a turn. Katana Slash n' Hack (1 Random, invisible) makes him ignore physical skills for a turn, and anyone who uses a new skill on him gets a Katana Slice back. 4th-Wall Break (one of every energy, 8 turn cooldown) is exactly what it sounds like: Deadpool realizes he's in a game and makes his own rules, and your opponent skips their next turn."),
        p("His passive, Cancer Factor, heals him at the start of his turn if no enemy damaged him last turn: 12 HP, then 9, 6 and down to 4 for each turn in a row. Hit him and it resets."),
        p("To unlock him, complete the mission Maximum Effort: win 10 Quick or Ladder games with Wolverine, and win 4 in a row with Wolverine."),
        link("Go to Deadpool's mission: Maximum Effort", '/missions.html'),
        divider,
        ...THANKS_AND_PROMISE('Comic Arena'),
    ],
    changes: skillChanges(deadpool, 'Deadpool'),
};

const pokemonPost = {
    releaseVersion: 'arena-portal-update-pokemon-v1',
    title: 'Pokemon Arena: A Whole New Look, Portrait Battles, and Mega Blaziken',
    arena: 'pokemon',
    author: 'kito',
    blocks: [
        ...REDESIGN,
        p('The Pokemon Arena front page now uses the same portal layout as Comic Arena, with the battle menu, your account and the ladders all on one screen, in Pokemon Arena colours.'),
        divider,
        p('Blaziken joins Pokemon Arena! This Fire/Fighting martial artist builds heat with every exchange, and once she lands a supercharged strike she Mega Evolves into Mega Blaziken, complete with a new portrait and a stronger signature move.'),
        p("Smoldering Roundhouse (1 red) deals 15 physical and 5 affliction damage, and every use permanently makes all of Blaziken's affliction damage 5 higher. Sky Uppercut (1 yellow, 1 random) deals 30 damage and counters the first new enemy skill used on her that turn. Fiery Roar (1 red, 1 random) supercharges her heat so her next harmful skill deals 30 extra affliction damage. Arm Guard makes her invulnerable for a turn."),
        p('The first time Fiery Roar\'s bonus lands, Blaziken Mega Evolves and heals 10 HP, and Fiery Roar becomes Blaze Kick (2 red): 5 affliction damage to the enemy team, and her next 2 harmful skills each deal 35 extra affliction damage.'),
        p('To unlock her, complete the Blaziken Blazing Kick Trial: win 10 Quick or Ladder games with Charmander and 4 in a row with Charmander, then do the same with Cyndaquil.'),
        link('Go to the Blaziken Blazing Kick Trial', '/pokemon-missions'),
        divider,
        ...THANKS_AND_PROMISE('Pokemon Arena'),
    ],
    changes: skillChanges(blaziken, 'Blaziken'),
};

const paragraphsOf = (post) => post.blocks.filter((block) => block.type === 'paragraph').map((block) => block.text);

const normalizeIds = (entries = []) =>
    (Array.isArray(entries) ? entries : [])
        .map((entry) => (typeof entry?.characterId === 'string' ? entry.characterId.trim() : ''))
        .filter(Boolean);

function buildLatestReleasesState(existing = null) {
    const state = existing && typeof existing === 'object' ? existing : {};
    const value = state.value && typeof state.value === 'object' ? state.value : {};
    const prevComic = normalizeIds(state.releasesByArena?.comic || value.releasesByArena?.comic || state.comicReleases || state.releases || []);
    const prevPokemon = normalizeIds(state.releasesByArena?.pokemon || value.releasesByArena?.pokemon || state.pokemonReleases || []);
    const comic = ['deadpool', ...prevComic.filter((id) => id !== 'deadpool')].slice(0, 3).map((characterId) => ({ characterId }));
    const pokemon = ['blaziken', ...prevPokemon.filter((id) => id !== 'blaziken')].slice(0, 3).map((characterId) => ({ characterId }));
    return {
        key: latestReleasesKey,
        version: 'arena-portal-update-v1',
        releases: comic,
        comicReleases: comic,
        pokemonReleases: pokemon,
        releasesByArena: { comic, pokemon },
        value: { version: 'arena-portal-update-v1', releases: comic, comicReleases: comic, pokemonReleases: pokemon, releasesByArena: { comic, pokemon } },
        updatedAt: new Date(),
        updatedBy: 'sync_arena_portal_update_news',
    };
}

async function syncArenaPortalUpdateNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const now = options.now instanceof Date ? options.now : new Date();
    const newsPosts = db.collection(newsCollectionName);
    const appState = db.collection(appStateCollectionName);
    for (const post of [comicPost, pokemonPost]) {
        await newsPosts.updateOne(
            { releaseVersion: post.releaseVersion },
            { $set: { ...post, paragraphs: paragraphsOf(post), updatedAt: now }, $setOnInsert: { createdAt: now } },
            { upsert: true }
        );
    }
    const existing = await appState.findOne({ key: latestReleasesKey });
    await appState.updateOne({ key: latestReleasesKey }, { $set: buildLatestReleasesState(existing) }, { upsert: true });
    return { posts: 2 };
}

module.exports = { comicPost, pokemonPost, buildLatestReleasesState, syncArenaPortalUpdateNews };
