const { MongoClient } = require('mongodb');
require('dotenv').config();

// Comic Arena: characters on the Experimental Battlefield start getting their own battle frames (Rick Grimes first).
// Synced at server startup; the same post can also be synced manually:
//   node sync_experimental_battlefield_poses_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const paragraphs = [
    'Characters on the Experimental Battlefield are starting to get their own battle frames, and Rick Grimes is first.',
    'When Rick attacks he raises his shotgun and aims, fires with a flash from the barrel, then pumps it and kicks out the spent shell. When he takes a hit he reels back, and when he is knocked out he drops to the ground and stays down until he is revived.',
    'More characters will get attack, hit and knockout frames over time. Characters without them move the same way they always have.',
    'To try the Experimental Battlefield, open Settings in any battle, press Options, and turn on Experimental battlefield (beta).',
];
const newsPost = {
    title: 'Comic Arena: Rick Grimes Gets Battle Frames on the Experimental Battlefield',
    arena: 'comic',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [],
    author: 'kito',
};

async function syncExperimentalBattlefieldPosesNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    await db.collection(newsCollectionName).updateOne(
        { title: newsPost.title },
        { $set: { ...newsPost, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
        { upsert: true }
    );
    return { posts: 1 };
}

async function runExperimentalBattlefieldPosesNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncExperimentalBattlefieldPosesNews(client.db(dbName));
        console.log('Synced the Experimental Battlefield battle frames news post.');
    } finally {
        await client.close();
    }
}

module.exports = { newsPost, syncExperimentalBattlefieldPosesNews };
if (require.main === module) {
    runExperimentalBattlefieldPosesNews().catch((error) => { console.error(error); process.exit(1); });
}
