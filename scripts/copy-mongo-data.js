const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

const projectRoot = path.join(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const newEnvPath = path.join(projectRoot, '.env.new');
if (fs.existsSync(newEnvPath)) {
    dotenv.config({ path: newEnvPath, override: false });
}

const sourceUri = process.env.SOURCE_MONGODB_URI || process.env.MONGODB_URI;
const sourceDbName = process.env.SOURCE_MONGODB_DB || process.env.MONGODB_DB || 'naruto-arena';
const targetUri = process.env.TARGET_MONGODB_URI;
const targetDbName = process.env.TARGET_MONGODB_DB || 'naruto-arena';

const collections = [
    process.env.MONGODB_USERS_COLLECTION || 'users',
    process.env.MONGODB_APP_STATE_COLLECTION || 'app_state',
    process.env.MONGODB_MATCHES_COLLECTION || 'matches',
    process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts',
];

async function replaceCollection(sourceDb, targetDb, collectionName) {
    const sourceCollection = sourceDb.collection(collectionName);
    const targetCollection = targetDb.collection(collectionName);
    const documents = await sourceCollection.find({}).toArray();

    await targetCollection.deleteMany({});
    if (documents.length) {
        await targetCollection.insertMany(documents, { ordered: false });
    }

    console.log(`${collectionName}: copied ${documents.length} document(s)`);
}

async function main() {
    if (!sourceUri) {
        throw new Error('Missing source MongoDB URI. Set MONGODB_URI in .env.');
    }
    if (!targetUri) {
        throw new Error('Missing target MongoDB URI. Add TARGET_MONGODB_URI to .env.new.');
    }
    if (sourceUri === targetUri && sourceDbName === targetDbName) {
        throw new Error('Source and target are the same. Refusing to overwrite the same database.');
    }

    const sourceClient = new MongoClient(sourceUri);
    const targetClient = new MongoClient(targetUri);

    await sourceClient.connect();
    await targetClient.connect();

    try {
        const sourceDb = sourceClient.db(sourceDbName);
        const targetDb = targetClient.db(targetDbName);

        console.log(`Copying from ${sourceDbName} to ${targetDbName}`);
        for (const collectionName of collections) {
            await replaceCollection(sourceDb, targetDb, collectionName);
        }
        console.log('Copy complete.');
    } finally {
        await sourceClient.close();
        await targetClient.close();
    }
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
