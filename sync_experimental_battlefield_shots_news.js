const { MongoClient } = require('mongodb');
require('dotenv').config();

// News: the Experimental Battlefield gets flying shots, a damage preview and better phone controls (both arenas).
// Synced at server startup; the same posts can also be synced manually:
//   node sync_experimental_battlefield_shots_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const paragraphsFor = (arenaName, example) => [
    `Ranged skills now fly across the Experimental Battlefield. ${example} The hit, the damage number and the health drop all land the moment the shot arrives.`,
    'See the damage before you commit. When you pick a skill, every target you can hit shows how much health it would lose, like "-30", and that slice of its health bar blinks. A "!" means the hit is extra strong against that target, and "KO" means it would knock it out.',
    'Phone players get easier controls: the skill buttons have more room around them to tap, and your phone gives a short buzz when you pick a skill or a target.',
    'To try the Experimental Battlefield, open Settings in any battle, press Options, and turn on Experimental battlefield (beta).',
];
const postFor = (arena, arenaName, example) => {
    const paragraphs = paragraphsFor(arenaName, example);
    return { title: `${arenaName}: Flying Shots and Damage Preview on the Experimental Battlefield`, arena, blocks: paragraphs.map((text) => ({ type: 'paragraph', text })), paragraphs, changes: [], author: 'kito' };
};
const comicPost = postFor('comic', 'Comic Arena', 'Blasts, beams and bullets travel from the attacker to the target in their own colour: Iron Man\'s repulsors fire a pale blue bolt, Green Lantern\'s willpower glows green, and gunfire comes as a burst of three tracers.');
const pokemonPost = postFor('pokemon', 'Pokemon Arena', 'Each move travels from the attacker to the target in its type colour: Ember is an orange fireball, Water Gun a blue jet, Thunder Shock a yellow bolt, and big moves like Flamethrower sweep across as a wide wave.');

async function syncExperimentalBattlefieldShotsNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    const posts = db.collection(newsCollectionName);
    for (const post of [comicPost, pokemonPost]) {
        await posts.updateOne({ title: post.title }, { $set: { ...post, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } }, { upsert: true });
    }
    return { posts: 2 };
}

async function runExperimentalBattlefieldShotsNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncExperimentalBattlefieldShotsNews(client.db(dbName));
        console.log('Synced the Experimental Battlefield shots news posts.');
    } finally {
        await client.close();
    }
}

module.exports = { comicPost, pokemonPost, syncExperimentalBattlefieldShotsNews };
if (require.main === module) {
    runExperimentalBattlefieldShotsNews().catch((error) => { console.error(error); process.exit(1); });
}
