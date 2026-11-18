const { MongoClient } = require('mongodb');
require('dotenv').config();

// Experimental Battlefield (beta): phones get the skill bars under each fighter too.
// Synced at server startup; the same posts can also be synced manually:
//   node sync_experimental_battlefield_phone_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const paragraphsFor = (arenaName) => [
    `The Experimental Battlefield beta for ${arenaName} now plays the same way on phones as on a computer: each of your fighters has its four skills right under its feet on the battlefield, instead of in a list below it.`,
    'On phones and small tablets the skills sit in a small two-by-two square, so all three fighters fit side by side without their skills running into each other. Tap a skill, then tap a glowing target, and the square folds down to just the skill you chose and who it is aimed at. Tap it again to change your mind.',
    'Phones held upright get a taller battlefield with the fighters spread out, so every square has room. Held sideways, the field also got a little taller so the front fighters\' squares are never cut off.',
    'To try it, open Settings in any battle, press Options, and turn on Experimental battlefield (beta). The classic view is still the default.',
];
const postFor = (arena, arenaName) => {
    const paragraphs = paragraphsFor(arenaName);
    return {
        title: `${arenaName}: Experimental Battlefield Skills on Phones`,
        arena,
        blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
        paragraphs,
        changes: [],
        author: 'kito',
    };
};
const comicPost = postFor('comic', 'Comic Arena');
const pokemonPost = postFor('pokemon', 'Pokemon Arena');

async function syncExperimentalBattlefieldPhoneNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    const posts = db.collection(newsCollectionName);
    for (const post of [comicPost, pokemonPost]) {
        await posts.updateOne(
            { title: post.title },
            { $set: { ...post, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
            { upsert: true }
        );
    }
    return { posts: 2 };
}

async function runExperimentalBattlefieldPhoneNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncExperimentalBattlefieldPhoneNews(client.db(dbName));
        console.log('Synced the Experimental Battlefield phone skills news posts.');
    } finally {
        await client.close();
    }
}

module.exports = { comicPost, pokemonPost, syncExperimentalBattlefieldPhoneNews };
if (require.main === module) {
    runExperimentalBattlefieldPhoneNews().catch((error) => { console.error(error); process.exit(1); });
}
