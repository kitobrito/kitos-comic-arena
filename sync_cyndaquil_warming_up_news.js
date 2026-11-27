const { MongoClient } = require('mongodb');
require('dotenv').config();

// Pokemon Arena: Cyndaquil's Warming-Up passive now deals its damage. Synced at server startup; also by hand:
//   node sync_cyndaquil_warming_up_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const paragraphs = [
    'Fixed: Cyndaquil\'s passive, Warming-Up, now hits back. Every skill Cyndaquil uses adds 5 to it, and whenever an enemy attacks Cyndaquil they take that much affliction damage.',
    'Before this fix the passive counted up but never dealt its damage.',
];
const pokemonPost = {
    title: 'Pokemon Arena: Cyndaquil Warming-Up Fix',
    arena: 'pokemon',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [],
    author: 'kito',
};

async function syncCyndaquilWarmingUpNews(db, options = {}) {
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
        await syncCyndaquilWarmingUpNews(client.db(dbName));
        console.log('Synced the Cyndaquil Warming-Up news post.');
    } finally {
        await client.close();
    }
}

module.exports = { pokemonPost, syncCyndaquilWarmingUpNews };
if (require.main === module) {
    run().catch((error) => { console.error(error); process.exit(1); });
}
