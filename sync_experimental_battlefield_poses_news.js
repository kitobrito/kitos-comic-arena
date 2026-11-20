const { MongoClient } = require('mongodb');
require('dotenv').config();

// Comic Arena: characters on the Experimental Battlefield start getting their own battle frames (Rick Grimes first).
// Both arenas: the sword-and-plus buff effect is removed.
// Synced at server startup; the same post can also be synced manually:
//   node sync_experimental_battlefield_poses_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const paragraphs = [
    'Characters on the Experimental Battlefield are starting to get their own battle frames, starting with Rick Grimes, the Rage Infected, the Walker and Homelander.',
    'When Rick attacks he raises his shotgun and aims, fires with a flash from the barrel, then pumps it and kicks out the spent shell. When he takes a hit he reels back, and when he is knocked out he drops to the ground and stays down until he is revived.',
    'The Rage Infected lunges in and claws wildly with a flurry of swipes, throws his head back screaming when he is hit, and collapses in a heap when he is knocked out.',
    'The Walker shambles forward, reaches out and lunges in to grab, reels back with a scream when she is hit, and drops to the ground when she is knocked out.',
    'Homelander has a different move for each skill. For Laser Death Beam his eyes glow red and twin lasers fire from them straight at the target. For Flying Assault he flies at the enemy and lands a punch, God\'s Fist is a full-power punch, and Unbreakable Body has him standing tall and smug. He reels when hit and lies flat when knocked out.',
    'More characters will get attack, hit and knockout frames over time. Characters without them move the same way they always have.',
    'The sword-and-plus effect that popped up over a fighter whenever they got a buff is gone, in both the classic and experimental views. Buffed fighters now just get a short gold glow, so it no longer covers the action.',
    'To try the Experimental Battlefield, open Settings in any battle, press Options, and turn on Experimental battlefield (beta).',
];
const pokemonParagraphs = [
    'The sword-and-plus effect that popped up over a Pokemon whenever it got a buff is gone, in both the classic and experimental views. Buffed Pokemon now just get a short glow, so it no longer covers the action.',
];
const pokemonPost = {
    title: 'Pokemon Arena: Buff Effect Removed',
    arena: 'pokemon',
    blocks: pokemonParagraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs: pokemonParagraphs,
    changes: [],
    author: 'kito',
};
const newsPost = {
    title: 'Comic Arena: Battle Frames for Rick Grimes, the Rage Infected, the Walker and Homelander',
    arena: 'comic',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [],
    author: 'kito',
};

async function syncExperimentalBattlefieldPosesNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    for (const post of [newsPost, pokemonPost]) {
        await db.collection(newsCollectionName).updateOne(
            { title: post.title },
            { $set: { ...post, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
            { upsert: true }
        );
    }
    return { posts: 2 };
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

module.exports = { newsPost, pokemonPost, syncExperimentalBattlefieldPosesNews };
if (require.main === module) {
    runExperimentalBattlefieldPosesNews().catch((error) => { console.error(error); process.exit(1); });
}
