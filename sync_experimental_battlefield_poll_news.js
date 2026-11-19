const { MongoClient } = require('mongodb');
require('dotenv').config();

// News: the Experimental Battlefield poll on the character select screen (both arenas).
// Synced at server startup; the same posts can also be synced manually:
//   node sync_experimental_battlefield_poll_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const paragraphsFor = (arenaName) => [
    `Tell us what you think of the Experimental Battlefield. There is a quick poll on the ${arenaName} character select screen: do you like the new full-body battle view, do you prefer the classic one, or have you not tried it yet?`,
    'You get one vote per account, and you can change it any time by opening the poll again. After you vote you can see how everyone else answered.',
    'Not tried it yet? Open Settings in any battle, press Options, and turn on Experimental battlefield (beta).',
];
const postFor = (arena, arenaName) => {
    const paragraphs = paragraphsFor(arenaName);
    return { title: `${arenaName}: Vote on the Experimental Battlefield`, arena, blocks: paragraphs.map((text) => ({ type: 'paragraph', text })), paragraphs, changes: [], author: 'kito' };
};
const comicPost = postFor('comic', 'Comic Arena');
const pokemonPost = postFor('pokemon', 'Pokemon Arena');

async function syncExperimentalBattlefieldPollNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    const posts = db.collection(newsCollectionName);
    for (const post of [comicPost, pokemonPost]) {
        await posts.updateOne({ title: post.title }, { $set: { ...post, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } }, { upsert: true });
    }
    return { posts: 2 };
}

async function runExperimentalBattlefieldPollNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncExperimentalBattlefieldPollNews(client.db(dbName));
        console.log('Synced the Experimental Battlefield poll news posts.');
    } finally {
        await client.close();
    }
}

module.exports = { comicPost, pokemonPost, syncExperimentalBattlefieldPollNews };
if (require.main === module) {
    runExperimentalBattlefieldPollNews().catch((error) => { console.error(error); process.exit(1); });
}
