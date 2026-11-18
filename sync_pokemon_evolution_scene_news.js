const { MongoClient } = require('mongodb');
require('dotenv').config();

// Pokemon Arena: the Experimental Battlefield gets its own evolution scene.
// Synced at server startup; the same post can also be synced manually:
//   node sync_pokemon_evolution_scene_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const paragraphs = [
    'Evolving on the Experimental Battlefield is now a moment. When one of your Pokemon evolves mid-battle, the arena dims and a pillar of light in its type colours rises around it, with "What? Charmander is evolving!" across the top.',
    'The Pokemon turns into a glowing silhouette and flickers between its old and new forms, faster and faster, until a flash and a shockwave reveal the evolved Pokemon in full colour: "Charmander evolved into Charmeleon!"',
    'It works for every evolution, including Rare Candy. If more than one Pokemon evolves at once, they take turns. Players who turn on reduced motion get a short, calm version.',
    'To try the Experimental Battlefield, open Settings in any battle, press Options, and turn on Experimental battlefield (beta). The classic view keeps its own evolution cinematic.',
];
const newsPost = {
    title: 'Pokemon Arena: Evolutions on the Experimental Battlefield',
    arena: 'pokemon',
    blocks: paragraphs.map((text) => ({ type: 'paragraph', text })),
    paragraphs,
    changes: [],
    author: 'kito',
};

async function syncPokemonEvolutionSceneNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    await db.collection(newsCollectionName).updateOne(
        { title: newsPost.title },
        { $set: { ...newsPost, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
        { upsert: true }
    );
    return { posts: 1 };
}

async function runPokemonEvolutionSceneNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncPokemonEvolutionSceneNews(client.db(dbName));
        console.log('Synced the Pokemon evolution scene news post.');
    } finally {
        await client.close();
    }
}

module.exports = { newsPost, syncPokemonEvolutionSceneNews };
if (require.main === module) {
    runPokemonEvolutionSceneNews().catch((error) => { console.error(error); process.exit(1); });
}
