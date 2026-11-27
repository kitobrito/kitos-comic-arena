const { MongoClient } = require('mongodb');
require('dotenv').config();

// Both arenas: Settings > User interface lets players pick the layout of the character select and of
// battles, including the new Scroll layout. Synced at server startup; also by hand:
//   node sync_user_interface_news.js
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'comic-arena';
const newsCollectionName = process.env.MONGODB_NEWS_POSTS_COLLECTION || 'news_posts';

const shared = [
    'There is a new User interface setting. Open Settings on the character select or in a battle, press User Interface, and choose how each screen looks: one tab for the character select and one for in-game.',
    'The new Scroll layout brings back the classic arena look. On the character select, the art fills the top of the screen, with Logout, Start Ladder Game, Start Quick Game and Start Private Game across the middle. Below them, the roster scroll holds 21 characters a page, with your player card and your team on the right. Filter, Missions and Styles sit along the bottom of the scroll, and Styles opens the User interface setting.',
    'In battle, the Scroll layout puts the names, avatars, the ready bar and your energy along the top. Each character sits beside their own skill scroll, the opponent’s team runs down the right, and Surrender, Open Chat and the volume are scroll buttons in the bottom-left. The scroll along the bottom shows your opponent’s clan, level, ladder rank and record, and switches to the skill you are looking at when you tap one.',
];
const cheshyNote = 'The character select layout that used to be called Experimental is now called Cheshy, and its Options button opens in full on phones and tablets again, so you can reach the User Interface setting from it. On phones, tapping a character in the Scroll layout now always opens their scroll so you can read them and their skills; double-tap to add them to your team.';
const fixNote = 'Fixed: on some visits the User Interface button in battle only showed "Interface options will appear here." and the Scroll layout would not switch on. Both now work: press User Interface to open the chooser.';
const comicParagraphs = [
    ...shared,
    'On Comic Arena the Scroll layout is drawn like a comic: cream newsprint with halftone dots, red ink frames and starburst buttons.',
    'Every other layout is still there: the Arena layout (the default), the Cheshy layout, the Classic layout and, in battle, the Experimental battlefield (beta). Your choice is saved on your device.',
    fixNote,
    cheshyNote,
];
const pokemonParagraphs = [
    ...shared,
    'On Pokemon Arena the Scroll layout is drawn in Poke Ball colours: white scrolls with red frames, navy outlines and Poke Ball buttons.',
    'Every other layout is still there: the Arena layout (the default), the Cheshy layout, the Classic layout and, in battle, the Experimental battlefield (beta). Your choice is saved on your device.',
    fixNote,
    cheshyNote,
];
const post = (title, arena, paragraphs) => ({ title, arena, blocks: paragraphs.map((text) => ({ type: 'paragraph', text })), paragraphs, changes: [], author: 'kito' });
const comicPost = post('Comic Arena: Choose Your User Interface, and the New Scroll Layout', 'comic', comicParagraphs);
const pokemonPost = post('Pokemon Arena: Choose Your User Interface, and the New Scroll Layout', 'pokemon', pokemonParagraphs);

async function syncUserInterfaceNews(db, options = {}) {
    if (!db) throw new Error('A MongoDB database connection is required.');
    const timestamp = options.now instanceof Date ? options.now : new Date();
    for (const item of [comicPost, pokemonPost]) {
        await db.collection(newsCollectionName).updateOne(
            { title: item.title },
            { $set: { ...item, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp } },
            { upsert: true }
        );
    }
    return { posts: 2 };
}

async function runUserInterfaceNews() {
    if (!uri) throw new Error('MONGODB_URI is required.');
    const client = new MongoClient(uri, { family: 4 });
    await client.connect();
    try {
        await syncUserInterfaceNews(client.db(dbName));
        console.log('Synced the User interface news posts.');
    } finally {
        await client.close();
    }
}

module.exports = { comicPost, pokemonPost, syncUserInterfaceNews };
if (require.main === module) {
    runUserInterfaceNews().catch((error) => { console.error(error); process.exit(1); });
}
