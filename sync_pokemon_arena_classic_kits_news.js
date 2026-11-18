const { MongoClient } = require('mongodb');
require('dotenv').config();

// Pokemon Arena: the V.4.x roster rework is rolled back and every Pokemon has its classic kit again.
// Synced at server startup; the same post can also be synced manually:
//   node sync_pokemon_arena_classic_kits_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const paragraphs = [
    'The classic kits are back. The V.4 roster rework, along with its combo and balance follow-ups, has been rolled back, and every Pokemon has the exact kit it had before the rework.',
    'That means the original skills, costs, cooldowns and evolution conditions for every Pokemon, including Charmander, Squirtle, Bulbasaur, Pidgey and the legendary birds. Blaziken, the community characters, Aerodactyl, Pokemon Trainer and Lance were never changed and stay as they are.',
    'Thanks to everyone who tried the rework. Nothing about your account, missions or unlocks has changed.',
];
// The rolled-back update's posts come down so the news page doesn't describe kits that no longer exist.
const removedPostTitles = [
    'Pokemon Arena Update V.4.0: Roster Rework',
    'Pokemon Arena Update V.4.1: Combos & Crits',
    'Pokemon Arena Update V.4.2: Balance Pass',
];
const newsPost = {
    title: 'Pokemon Arena: The Classic Kits Are Back',
    arena: 'pokemon',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [],
    author: 'kito',
};

async function syncPokemonArenaClassicKitsNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    const posts = db.collection(newsCollectionName);
    const removed = await posts.deleteMany({ arena: 'pokemon', title: { $in: removedPostTitles } });
    await posts.updateOne(
        { title: newsPost.title },
        { $set: { ...newsPost, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
        { upsert: true }
    );
    return { posts: 1, removed: removed?.deletedCount ?? 0 };
}

async function runPokemonArenaClassicKitsNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncPokemonArenaClassicKitsNews(client.db(dbName));
        console.log('Synced Pokemon Arena classic kits news.');
    } finally {
        await client.close();
    }
}

module.exports = { newsPost, removedPostTitles, syncPokemonArenaClassicKitsNews };
if (require.main === module) {
    runPokemonArenaClassicKitsNews().catch((error) => { console.error(error); process.exit(1); });
}
