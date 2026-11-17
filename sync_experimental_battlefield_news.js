'use strict';

// News for the Experimental Battlefield beta (an opt-in battle view) and the new start-of-turn
// energy animation. Run by server.js at startup; safe to run again (each post is upserted by its
// releaseVersion, and createdAt is only set the first time).

const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const p = (text) => ({ type: 'paragraph', text });
const divider = { type: 'divider' };

const BATTLEFIELD = (arenaName, setting) => [
    p(`There's a new way to watch your battles: the Experimental Battlefield. It's an optional beta view for ${arenaName} that puts your whole team on the field as full characters instead of portrait boxes, ${setting}.`),
    p('Characters are drawn at sizes that match how big they really are, and attacks play out on screen: melee fighters dash across and strike, ranged attacks kick back as they fire, hits land with a flash and a knockback right as the blow connects, and knocked-out fighters slump to the ground. A glowing line splits the arena between your team and theirs.'),
    p('Each of your fighters has their skill bar right under their feet. Pick a skill, tap a glowing target, and that bar folds down to just the skill you chose and who it is aimed at. Tap it again to change your mind. Your opponent has greyed-out skill bars too, and you can tap any of their skills to read exactly what it does. Your energy, the timer and the Ready button sit together at the top, with a big YOUR TURN banner underneath.'),
    p('To try it, open Settings in any battle, press Options, and turn on Experimental battlefield (beta). It is the same match with the same rules, only shown differently. You can switch back at any time with the Classic view button or by turning the option off. The classic view stays the default for everyone.'),
];

const ENERGY = [
    p('Separately, every battle now shows your energy at the start of your turn, in both views. The energy you gained appears over the battlefield and flies into your energy bar. If your opponent destroyed some of your energy, you will see it shatter, and if they stole it, you will see it snatched across the field to the enemy who took it.'),
    p('The Options list in battle Settings was also cut off and could not be seen on the current battle screen. It now opens properly inside the Settings panel.'),
];

const CLOSING = p('This is a beta, so please tell me on Discord what you think and anything that looks off, especially on your phone. Phones currently show the skill bars as a list below the battlefield instead of under each fighter.');

const comicPost = {
    releaseVersion: 'experimental-battlefield-comic-v1',
    title: 'Comic Arena: Try the Experimental Battlefield (Beta)',
    arena: 'comic',
    author: 'kito',
    blocks: [...BATTLEFIELD('Comic Arena', 'standing in a packed night-time stadium under the floodlights'), divider, ...ENERGY, divider, CLOSING],
};

const pokemonPost = {
    releaseVersion: 'experimental-battlefield-pokemon-v1',
    title: 'Pokemon Arena: Try the Experimental Battlefield (Beta)',
    arena: 'pokemon',
    author: 'kito',
    blocks: [...BATTLEFIELD('Pokemon Arena', 'facing off in the forest, from tiny Pikachu to towering Onix'), divider, ...ENERGY, divider, CLOSING],
};

const paragraphsOf = (post) => post.blocks.filter((block) => block.type === 'paragraph').map((block) => block.text);

async function syncExperimentalBattlefieldNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const now = options.now instanceof Date ? options.now : new Date();
    const newsPosts = db.collection(newsCollectionName);
    for (const post of [comicPost, pokemonPost]) {
        await newsPosts.updateOne(
            { releaseVersion: post.releaseVersion },
            { $set: { ...post, paragraphs: paragraphsOf(post), updatedAt: now }, $setOnInsert: { createdAt: now } },
            { upsert: true }
        );
    }
    return { posts: 2 };
}

module.exports = { comicPost, pokemonPost, syncExperimentalBattlefieldNews };
