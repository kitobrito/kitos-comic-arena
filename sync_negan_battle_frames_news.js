const { MongoClient } = require('mongodb');
require('dotenv').config();

// Comic Arena: Negan gets his own battle frames on the Experimental Battlefield, with a blood spray and a burn
// mark landing on whoever he hits with the knife and the iron.
// Synced at server startup; the same post can also be synced manually:
//   node sync_negan_battle_frames_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const paragraphs = [
    'Negan now has his own battle frames on the Experimental Battlefield, with a different move for each skill.',
    'For You\'re Already Fucked he raises Lucille over his head, swings it straight through the target and follows through low. For You Got No Guts he lunges in with a knife and blood sprays out of the target. For The Iron he shoves a red-hot iron into the target and it leaves a smoking burn. For Bat Smashes Knives he lifts Lucille high and brings it crashing down.',
    'When Negan takes a hit he reels back clutching Lucille, and when he is knocked out he lies flat with the bat beside him until he is revived.',
    'To try the Experimental Battlefield, open Settings in any battle, press Options, and turn on Experimental battlefield (beta).',
];
const newsPost = {
    title: 'Comic Arena: Battle Frames for Negan',
    arena: 'comic',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [],
    author: 'kito',
};

async function syncNeganBattleFramesNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    await db.collection(newsCollectionName).updateOne(
        { title: newsPost.title },
        { $set: { ...newsPost, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
        { upsert: true }
    );
    return { posts: 1 };
}

async function runNeganBattleFramesNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncNeganBattleFramesNews(client.db(dbName));
        console.log('Synced the Negan battle frames news post.');
    } finally {
        await client.close();
    }
}

module.exports = { newsPost, syncNeganBattleFramesNews };
if (require.main === module) {
    runNeganBattleFramesNews().catch((error) => { console.error(error); process.exit(1); });
}
