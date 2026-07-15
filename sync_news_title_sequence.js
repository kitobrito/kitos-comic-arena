const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const titleRenames = [
    { from: 'Comic-Arena Beta V 1.3', to: 'Comic Arena Update V.3.1.0' },
    { from: 'comic arena balance v 3.1.1', to: 'Comic Arena Update V.3.1.1' },
];

async function syncNewsTitleSequence() {
    if (!uri) {
        throw new Error('MONGODB_URI is required in the environment.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const newsPosts = db.collection(newsCollectionName);
        const now = new Date();

        for (const rename of titleRenames) {
            const existing = await newsPosts.findOne({ title: rename.from });
            if (!existing || !existing._id) continue;

            await newsPosts.updateOne(
                { _id: existing._id },
                {
                    $set: {
                        title: rename.to,
                        updatedAt: now,
                    },
                }
            );
        }

        console.log('Synced news post titles into sequential order.');
    } finally {
        await client.close();
    }
}

syncNewsTitleSequence().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
