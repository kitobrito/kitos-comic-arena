const { MongoClient } = require('mongodb');
require('dotenv').config();

// Pokemon Arena: the ten new rank hats. Synced at server startup; also by hand:
//   node sync_pokemon_rank_hats_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const paragraphs = [
    'Pokemon Arena has its own rank hats. Every ladder rank now has a Pokemon hat that wraps around your characters in battle, partly in front of the picture and partly behind it.',
    'From the first rank to the last: Onix, Starmie, Raichu, Vileplume, Weezing, Alakazam, Arcanine, Rhydon, Zapdos and, at the very top, Mew.',
    'Your hat changes as you climb the ladder, and everyone in your battles sees it. Comic Arena keeps its own hats.',
];
const showcase = {
    type: 'image',
    src: '/assets/images/news/pokemon-rank-hats.png',
    alt: 'The ten Pokemon Arena rank hats on Pokemon Trainer: Onix, Starmie, Raichu, Vileplume, Weezing, Alakazam, Arcanine, Rhydon, Zapdos and Mew',
};
const pokemonPost = {
    title: 'Pokemon Arena: New Rank Hats',
    arena: 'pokemon',
    blocks: [{ type: 'paragraph', text: paragraphs[0] }, showcase, ...paragraphs.slice(1).map((text) => ({ type: 'paragraph', text }))],
    paragraphs,
    changes: [],
    author: 'kito',
};

async function syncPokemonRankHatsNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    await db.collection(newsCollectionName).updateOne(
        { title: pokemonPost.title },
        { $set: { ...pokemonPost, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
        { upsert: true }
    );
    return { posts: 1 };
}

async function run() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncPokemonRankHatsNews(client.db(dbName));
        console.log('Synced the Pokemon rank hats news post.');
    } finally {
        await client.close();
    }
}

module.exports = { pokemonPost, syncPokemonRankHatsNews };
if (require.main === module) {
    run().catch((error) => { console.error(error); process.exit(1); });
}
